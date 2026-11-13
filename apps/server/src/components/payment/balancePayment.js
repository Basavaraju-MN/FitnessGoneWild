// Balance payments: a guide (Trek Lead portal) collects a customer's
// remaining balance through PhonePe, the same gateway as website bookings.
//   1. create()  makes a PhonePe order for the booking's balance; the guide
//                opens its payment page (QR to scan) or sends the link to
//                the customer on WhatsApp
//   2. PhonePe confirms it (status check, webhook, or the recovery sweep:
//      all of them end in apply()), and only a VERIFIED success is used
//   3. apply()   adds the payment to the booking once (never twice, even if
//                several confirmations arrive together)
// Orders start with FGWBAL_ so they are never mistaken for a new booking.
const path = require('path');
const { randomUUID } = require('crypto');
const { StandardCheckoutPayRequest } = require('@phonepe-pg/pg-sdk-node');

const { executeQuery } = require('../../db/connection');
const paymentDbOps = require('../../db/paymentDbops');

// PhonePe settings (PHONEPE_*) are in the website's .env. Live, the admin
// runs inside the website server and already has them; when the admin
// server runs on its own (local development) they are read from there.
function loadPhonePeSettings() {
  if (!process.env.PHONEPE_CLIENT_ID) {
    require('dotenv').config({ path: path.join(__dirname, '../../../.env'), quiet: true });
  }
}
const phonePe = () => {
  loadPhonePeSettings();
  return require('../../config/config').phonePeClient;
};

const PREFIX = 'FGWBAL_';
const isBalanceOrder = (merchantOrderId) => String(merchantOrderId || '').startsWith(PREFIX);

const SQL = {
  booking: `
    SELECT b.id, b.booking_ref, b.departure_id, b.status, b.amount, b.amount_paid, b.balance_amount, b.payment_status,
           c.name AS customer_name, c.phone AS customer_phone, t.name AS trip_name
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN trips t ON t.id = b.trip_id
    WHERE b.id = ?`,
  // A link made in the last 15 minutes for the same booking and amount, still open
  openOrder: `
    SELECT merchant_order_id, redirect_url, booking_details FROM phonepe_transactions
    WHERE merchant_order_id LIKE 'FGWBAL\\_%' AND status IN ('PROCESSING','PENDING')
      AND created_at > NOW() - INTERVAL 15 MINUTE
      AND JSON_EXTRACT(booking_details, '$.bookingId') = ? AND amount = ?
    ORDER BY id DESC LIMIT 1`,
  // Claims the order for this one apply (atomic: only one caller gets a row)
  claim: `
    UPDATE phonepe_transactions
       SET booking_details = JSON_SET(booking_details, '$.appliedAt', DATE_FORMAT(NOW(), '%Y-%m-%d %H:%i:%s'))
     WHERE merchant_order_id = ? AND status = 'SUCCESS'
       AND JSON_EXTRACT(booking_details, '$.appliedAt') IS NULL`,
  addPayment: `
    INSERT INTO booking_payments (booking_id, amount, method, reference, note, received_by, paid_at)
    VALUES (?, ?, 'phonepe', ?, ?, ?, NOW())`,
  // MySQL sets the columns left to right, so balance and status use the new amount_paid
  updateBooking: `
    UPDATE bookings
       SET amount_paid = amount_paid + ?,
           balance_amount = GREATEST(0, amount - amount_paid),
           payment_status = CASE WHEN amount_paid <= 0 THEN 'unpaid'
                                 WHEN amount_paid + 0.009 >= amount THEN 'paid'
                                 ELSE 'partial' END
     WHERE id = ?`,
  // PhonePe balance payments of one booking (shown with the booking)
  ofBooking: `
    SELECT merchant_order_id, amount / 100 AS amount, status, created_at, updated_at
    FROM phonepe_transactions
    WHERE merchant_order_id LIKE 'FGWBAL\\_%' AND JSON_EXTRACT(booking_details, '$.bookingId') = ?
    ORDER BY id DESC`,
};

const toDetails = (value) => {
  if (value && typeof value === 'object') return value;
  try { return JSON.parse(value || '{}'); } catch { return {}; }
};

const httpError = (status, message) => Object.assign(new Error(message), { status });

/**
 * PhonePe order for the booking's remaining balance (or part of it: amount).
 * returnUrl: where PhonePe sends the payer afterwards (+ ?order=…).
 * Returns { merchantOrderId, checkoutUrl, amount, booking }.
 */
async function create({ bookingId, collectedBy, returnUrl, amount: wanted }) {
  const [booking] = await executeQuery(SQL.booking, [bookingId]);
  if (!booking) throw httpError(404, 'Booking not found');
  if (booking.status === 'cancelled') throw httpError(400, 'This booking is cancelled');
  const left = Math.round(Number(booking.balance_amount) * 100) / 100;
  if (!(left > 0)) throw httpError(400, 'Nothing left to pay on this booking');
  // Part of the balance (the rest paid in cash), or all of it
  const balance = wanted === undefined || wanted === null || wanted === '' ? left : Math.round(Number(wanted) * 100) / 100;
  if (!(balance > 0)) throw httpError(400, 'Enter the amount to pay online');
  if (balance > left + 0.009) throw httpError(400, `Only ₹${left} is left to pay`);
  const amountInPaise = Math.round(balance * 100);

  // Same link again if one was just made (the guide clicked twice, or reopened it)
  const [open] = await executeQuery(SQL.openOrder, [booking.id, amountInPaise]);
  if (open && toDetails(open.booking_details).checkoutUrl) {
    return { merchantOrderId: open.merchant_order_id, checkoutUrl: toDetails(open.booking_details).checkoutUrl, amount: balance, booking };
  }

  const merchantOrderId = `${PREFIX}${Date.now()}_${randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const redirectUrl = `${returnUrl}${returnUrl.includes('?') ? '&' : '?'}order=${encodeURIComponent(merchantOrderId)}`;
  const details = {
    kind: 'balance',
    bookingId: booking.id,
    bookingRef: booking.booking_ref,
    customerName: booking.customer_name,
    customerPhone: booking.customer_phone,
    trekName: booking.trip_name,
    paymentType: 'balance',
    collectedBy: collectedBy || null,
  };

  await paymentDbOps.createTransaction(merchantOrderId, amountInPaise, 'INR', redirectUrl, details);

  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId(merchantOrderId)
    .amount(amountInPaise)
    .redirectUrl(redirectUrl)
    .build();
  let response;
  try {
    response = await phonePe().pay(request);
    if (!response?.redirectUrl) throw new Error('PhonePe payment page was not created');
  } catch (error) {
    // Never reached PhonePe: not left as "processing" in the Payments list
    await executeQuery("UPDATE phonepe_transactions SET status = 'FAILED', updated_at = NOW() WHERE merchant_order_id = ?", [merchantOrderId])
      .catch(() => {});
    throw error;
  }

  // Kept so the same link can be shown again
  await executeQuery(
    "UPDATE phonepe_transactions SET booking_details = JSON_SET(booking_details, '$.checkoutUrl', ?) WHERE merchant_order_id = ?",
    [response.redirectUrl, merchantOrderId]
  );
  return { merchantOrderId, checkoutUrl: response.redirectUrl, amount: balance, booking };
}

/**
 * Adds a VERIFIED successful balance payment to its booking, once.
 * Called from every place that learns PhonePe's answer.
 */
async function apply(transaction) {
  if (!transaction || String(transaction.status || '').toUpperCase() !== 'SUCCESS') return null;
  const details = toDetails(transaction.booking_details);
  if (details.kind !== 'balance' || !details.bookingId) return null;

  const claimed = await executeQuery(SQL.claim, [transaction.merchant_order_id]);
  if (!claimed.affectedRows) return null; // already added (or not paid)

  const amount = Math.round(Number(transaction.amount || 0)) / 100;
  const note = `PhonePe balance payment${transaction.transaction_id ? ` · ${transaction.transaction_id}` : ''}`;
  await executeQuery(SQL.addPayment, [details.bookingId, amount, transaction.merchant_order_id, note, details.collectedBy || null]);
  await executeQuery(SQL.updateBooking, [amount, details.bookingId]);

  try {
    await executeQuery(
      'INSERT INTO activity_log (admin_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
      [details.collectedBy || null, 'payment', 'booking', details.bookingId, `₹${amount} via PhonePe (balance) · ${transaction.merchant_order_id}`]
    );
  } catch (error) {
    console.error('activity_log write failed:', error?.message || error);
  }
  console.log(`Balance payment ${transaction.merchant_order_id}: ₹${amount} added to booking ${details.bookingRef || details.bookingId}`);
  return { bookingId: details.bookingId, amount };
}

/**
 * Asks PhonePe about the order (verified with PhonePe, not trusted from the
 * browser) and adds it to the booking when paid.
 * Returns { status: SUCCESS | PROCESSING | FAILED, booking }.
 */
async function check(merchantOrderId) {
  // Lazy: phonepeComponent → bookingDbops → this file
  loadPhonePeSettings();
  const phonepeComponent = require('./phonepeComponent');
  const { status } = await phonepeComponent.checkPaymentStatus(merchantOrderId);
  const transaction = await paymentDbOps.getTransactionByOrderId(merchantOrderId);
  if (status === 'SUCCESS') await apply(transaction);
  const details = toDetails(transaction?.booking_details);
  const [booking] = details.bookingId ? await executeQuery(SQL.booking, [details.bookingId]) : [];
  return { status, amount: Number(transaction?.amount || 0) / 100, booking: booking || null };
}

async function orderDetails(merchantOrderId) {
  const transaction = await paymentDbOps.getTransactionByOrderId(merchantOrderId);
  return transaction && isBalanceOrder(merchantOrderId) ? { transaction, details: toDetails(transaction.booking_details) } : null;
}

const ofBooking = (bookingId) => executeQuery(SQL.ofBooking, [bookingId]);

/* ---------- Page PhonePe sends the payer back to: /balance-paid?order=… ---------- */

const escape = (text) => String(text ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const inr = (value) => `₹${Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

// The admin portal (guide portal). Same rule as the admin's own config:
// ADMIN_APP_URL, else /admin/ live and the Vite dev server locally.
const ADMIN_APP_URL = process.env.ADMIN_APP_URL
  || (process.env.NODE_ENV === 'production' ? '/admin/' : 'http://localhost:5175/');

// The guide's own browser is logged in to the admin portal (its session
// cookie is sent here too); a customer paying on their phone is not
const hasAdminSession = (req) => /(?:^|;\s*)fgw_admin=/.test(String(req.headers.cookie || ''));

// back: where the guide's browser goes after the result (closes the tab
// first when the portal opened it) — /balance-paid.js does it
function page(title, message, tone, refresh, back) {
  const colour = { ok: '#1f7a4d', wait: '#a26200', bad: '#b3261e' }[tone];
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
${refresh ? '<meta http-equiv="refresh" content="5">' : ''}
${back ? `<meta http-equiv="refresh" content="4;url=${escape(back)}">` : ''}
<title>${escape(title)} | The Fitness Gone Wild</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#f4f7f5;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;color:#1d2b26}
.box{max-width:420px;margin:16px;padding:32px 26px;background:#fff;border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.08);text-align:center}
h1{margin:0 0 10px;font-size:1.5rem;color:${colour}}p{margin:6px 0;line-height:1.5}small{color:#667}
.back{display:inline-block;margin-top:14px;padding:11px 18px;border-radius:10px;background:#4681db;color:#fff;font-weight:700;text-decoration:none}</style></head>
<body${back ? ` data-back="${escape(back)}"` : ''}><div class="box"><h1>${escape(title)}</h1>${message}
${back ? `<a class="back" href="${escape(back)}">Back to the trip portal</a><p><small>Going back by itself…</small></p>` : ''}
<p><small>The Fitness Gone Wild</small></p></div>
${back ? '<script src="/balance-paid.js"></script>' : ''}</body></html>`;
}

// Script for the page above (the site allows only its own script files):
// a tab the portal opened closes itself; otherwise go back to the portal
const RETURN_SCRIPT = `(function () {
  var back = document.body.getAttribute('data-back');
  if (!back) return;
  setTimeout(function () {
    // Closes only a tab the portal opened (the portal tab shows the result);
    // where the browser does not allow it, this tab goes back to the portal
    try { window.close(); } catch (e) {}
    setTimeout(function () { window.location.replace(back); }, 400);
  }, 1500);
})();
`;
function returnScript(req, res) {
  res.set('Content-Type', 'application/javascript; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(RETURN_SCRIPT);
}

async function returnPage(req, res) {
  const order = String(req.query.order || '').trim();
  res.set('Cache-Control', 'no-store');
  if (!isBalanceOrder(order) || !/^[\w-]{10,100}$/.test(order)) {
    return res.status(404).send(page('Payment not found', '<p>This payment link is not valid.</p>', 'bad'));
  }
  try {
    const found = await orderDetails(order);
    if (!found) return res.status(404).send(page('Payment not found', '<p>This payment link is not valid.</p>', 'bad'));
    const { status, amount } = await check(order);
    const about = `<p>${inr(amount)} · booking ${escape(found.details.bookingRef || '')}</p>`;
    // The guide's browser: back to My Assigned Trips, which shows the result
    const back = hasAdminSession(req) && status !== 'PROCESSING'
      ? `${ADMIN_APP_URL}my-trips?paid=${encodeURIComponent(order)}` : null;
    if (status === 'SUCCESS') return res.send(page('Payment received', `${about}<p>Thank you, ${escape(found.details.customerName || '')}! Your balance is paid. Have a great trek.</p>`, 'ok', false, back));
    if (status === 'FAILED') return res.send(page('Payment failed', `${about}<p>No money was taken. Please ask your trek lead for a new payment link.</p>`, 'bad', false, back));
    return res.send(page('Checking your payment…', `${about}<p>This page updates by itself in a few seconds.</p>`, 'wait', true));
  } catch (error) {
    console.error('Balance payment page:', error?.message || error);
    return res.send(page('Checking your payment…', '<p>We could not reach PhonePe just now. This page tries again in a few seconds.</p>', 'wait', true));
  }
}

module.exports = { PREFIX, isBalanceOrder, create, apply, check, orderDetails, ofBooking, returnPage, returnScript };
