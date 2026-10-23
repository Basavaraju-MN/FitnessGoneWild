// Customer invoice page: thefitnessgonewild.in/invoice/<token>
// The token is a private random code per booking (bookings.invoice_token),
// created when the admin sends the invoice on WhatsApp.
const { executeQuery } = require('../../db/connection');
const { buildInvoicePdf } = require('./invoicePdf');

const queries = {
  booking: `
    SELECT b.id, b.booking_ref, b.status, b.payment_status, b.payment_type,
           b.people, b.with_transport_people, b.without_transport_people, b.travel_mode,
           b.trek_start_date, b.trek_end_date, b.amount, b.amount_paid, b.balance_amount,
           b.refund_amount, b.merchant_order_id, b.paid_at, b.booked_at,
           b.invoice_token,
           c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           t.name AS trip_name, p.name AS pickup_name, p.address AS pickup_address
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN trips t ON t.id = b.trip_id
    LEFT JOIN pickup_points p ON p.id = b.pickup_point_id
    WHERE b.invoice_token = ?`,
  bookingIdWhere: 'b.id = ?',
  payments: 'SELECT amount, method, reference, paid_at FROM booking_payments WHERE booking_id = ? ORDER BY paid_at',
  refunds: "SELECT amount, mode, method, completed_at, created_at FROM booking_refunds WHERE booking_id = ? AND state = 'completed' ORDER BY id",
  settings: "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('business_name','contact_phone','contact_email','business_address','gst_percent')",
};

// The website's own logo (served by this same server)
const LOGO = '/images/logo.png';

const esc = (v) => String(v ?? '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#039;');
const rupees = (v) => `₹${Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (v) => (v ? new Date(String(v).replace(' ', 'T')).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—');
const METHOD = { upi: 'UPI', cash: 'Cash', bank_transfer: 'Bank transfer', card: 'Card', phonepe: 'PhonePe', other: 'Other' };

async function loadInvoice(token) {
  if (!/^[A-Za-z0-9_-]{16,40}$/.test(String(token || ''))) return null;
  return loadInvoiceData(queries.booking, token);
}

// For the admin (already logged in): by booking id
async function loadInvoiceByBookingId(id) {
  return loadInvoiceData(queries.booking.replace('b.invoice_token = ?', queries.bookingIdWhere), Number(id));
}

async function loadInvoiceData(sql, param) {
  const rows = await executeQuery(sql, [param]);
  const booking = rows?.[0];
  if (!booking) return null;

  const [payments, refunds, settingRows] = await Promise.all([
    executeQuery(queries.payments, [booking.id]),
    executeQuery(queries.refunds, [booking.id]).catch(() => []),
    executeQuery(queries.settings),
  ]);
  const settings = Object.fromEntries((settingRows || []).map((r) => [r.setting_key, r.setting_value]));
  return { booking, payments: payments || [], refunds: refunds || [], settings };
}

function renderInvoice({ booking: b, payments, refunds, settings }) {
  const gst = Number(settings.gst_percent || 5);
  const total = Number(b.amount);
  const taxable = total / (1 + gst / 100);
  const recorded = payments.reduce((s, p) => s + Number(p.amount), 0);
  const online = Math.max(0, Number(b.amount_paid) - recorded);

  // Payment history: the online payment at booking + payments recorded by the team
  const history = [
    ...(online > 0.009 ? [{ date: b.paid_at || b.booked_at, how: 'PhonePe (online)', ref: b.merchant_order_id, amount: online }] : []),
    ...payments.map((p) => ({ date: p.paid_at, how: METHOD[p.method] || p.method, ref: p.reference, amount: Number(p.amount) })),
  ];
  const refunded = refunds.reduce((s, r) => s + Number(r.amount), 0);
  const balance = Number(b.balance_amount);
  const cancelled = b.status === 'cancelled';
  const statusText = cancelled ? 'Cancelled' : balance > 0.009 ? 'Balance due' : 'Paid in full';
  const statusClass = cancelled ? 'grey' : balance > 0.009 ? 'due' : 'paid';
  const dates = b.trek_end_date && b.trek_end_date !== b.trek_start_date
    ? `${date(b.trek_start_date)} → ${date(b.trek_end_date)}` : date(b.trek_start_date);
  const transport = b.travel_mode === 'mixed'
    ? `${b.with_transport_people} with transport, ${b.without_transport_people} without`
    : b.travel_mode === 'without_transport' ? 'Without transport' : 'With transport';

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>Invoice ${esc(b.booking_ref)} · ${esc(settings.business_name || 'The Fitness Gone Wild')}</title>
<style>
  *{box-sizing:border-box}
  body{margin:0;background:#eef2ef;font:14px/1.5 -apple-system,'Segoe UI',Roboto,Arial,sans-serif;color:#1d2a27}
  .page{max-width:820px;margin:24px auto;background:#fff;border-radius:14px;box-shadow:0 10px 30px rgba(15,61,54,.12);overflow:hidden}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;padding:26px 30px;background:#0F3D36;color:#fff}
  .top img{height:64px;background:#fff;border-radius:10px;padding:6px 10px}
  .biz{font-size:12px;color:#c9dad4;margin-top:8px;line-height:1.6}
  .doc{text-align:right}
  .doc h1{margin:0;font-size:26px;letter-spacing:.06em}
  .doc div{font-size:12px;color:#c9dad4}
  .status{display:inline-block;margin-top:8px;padding:4px 12px;border-radius:999px;font-size:12px;font-weight:700}
  .status.paid{background:#d9f2e3;color:#1f6b3d}.status.due{background:#fde9cf;color:#8a4a08}.status.grey{background:#e5e7eb;color:#4b5563}
  .body{padding:24px 30px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-bottom:20px}
  .box h3{margin:0 0 6px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b7c77}
  .box p{margin:0}
  table{width:100%;border-collapse:collapse;margin:6px 0 18px}
  th{background:#f2f5f1;text-align:left;font-size:12px;color:#4b5b56;padding:9px 10px;border-bottom:1px solid #dde4de}
  td{padding:10px;border-bottom:1px solid #eef1ee;vertical-align:top}
  .r{text-align:right;white-space:nowrap}
  .totals{margin-left:auto;width:min(340px,100%)}
  .totals div{display:flex;justify-content:space-between;padding:6px 0}
  .totals .big{border-top:2px solid #0F3D36;margin-top:6px;padding-top:10px;font-size:16px;font-weight:700}
  .totals .due{color:#8a4a08;font-weight:700}
  .note{margin-top:18px;padding:12px 14px;background:#f6f8f5;border-radius:10px;font-size:12px;color:#55645f}
  .actions{display:flex;justify-content:center;gap:10px;padding:0 30px 26px}
  .actions button,.actions a{border:0;border-radius:999px;padding:11px 20px;font-weight:700;font-size:14px;cursor:pointer;text-decoration:none}
  .print{background:#E4881F;color:#fff}
  @media(max-width:600px){.top{flex-direction:column}.doc{text-align:left}.grid{grid-template-columns:1fr}.body,.top{padding:20px}}
  @media print{body{background:#fff}.page{box-shadow:none;margin:0;border-radius:0}.actions{display:none}}
</style>
</head>
<body>
<div class="page">
  <div class="top">
    <div>
      ${LOGO ? `<img src="${LOGO}" alt="${esc(settings.business_name)}">` : ''}
      <div class="biz">
        <strong style="color:#fff">${esc(settings.business_name || 'The Fitness Gone Wild')}</strong><br>
        ${esc(settings.business_address || '')}<br>
        ${esc(settings.contact_phone || '')}${settings.contact_email ? ` · ${esc(settings.contact_email)}` : ''}
      </div>
    </div>
    <div class="doc">
      <h1>INVOICE</h1>
      <div>No. INV-${esc(b.booking_ref)}</div>
      <div>Booked on ${date(b.booked_at)}</div>
      <span class="status ${statusClass}">${statusText}</span>
    </div>
  </div>

  <div class="body">
    <div class="grid">
      <div class="box">
        <h3>Billed to</h3>
        <p><strong>${esc(b.customer_name)}</strong><br>${esc(b.customer_phone)}${b.customer_email ? `<br>${esc(b.customer_email)}` : ''}</p>
      </div>
      <div class="box">
        <h3>Trip</h3>
        <p><strong>${esc(b.trip_name || 'Trip')}</strong><br>${dates}<br>Pickup: ${esc(b.pickup_name ? `${b.pickup_name}${b.pickup_address ? ` – ${b.pickup_address}` : ''}` : 'Self')}</p>
      </div>
    </div>

    <table>
      <thead><tr><th>Description</th><th class="r">People</th><th class="r">Amount</th></tr></thead>
      <tbody>
        <tr>
          <td><strong>${esc(b.trip_name || 'Trip')}</strong><br><span style="color:#6b7c77">${transport} · Booking ${esc(b.booking_ref)}</span></td>
          <td class="r">${Number(b.people)}</td>
          <td class="r">${rupees(total)}</td>
        </tr>
      </tbody>
    </table>

    <div class="totals">
      <div><span>Trip amount (without GST)</span><span>${rupees(taxable)}</span></div>
      <div><span>GST (${gst}%)</span><span>${rupees(total - taxable)}</span></div>
      <div class="big"><span>Total</span><span>${rupees(total)}</span></div>
      <div><span>Paid</span><span>${rupees(b.amount_paid)}</span></div>
      ${refunded > 0.009 ? `<div><span>Refunded</span><span>− ${rupees(refunded)}</span></div>` : ''}
      ${!cancelled ? `<div class="${balance > 0.009 ? 'due' : ''}"><span>Balance due</span><span>${rupees(balance)}</span></div>` : ''}
    </div>

    ${history.length ? `
    <h3 style="margin:22px 0 4px;font-size:11px;letter-spacing:.12em;text-transform:uppercase;color:#6b7c77">Payments received</h3>
    <table>
      <thead><tr><th>Date</th><th>Paid by</th><th>Reference</th><th class="r">Amount</th></tr></thead>
      <tbody>
        ${history.map((h) => `<tr><td>${date(h.date)}</td><td>${esc(h.how)}</td><td>${esc(h.ref || '—')}</td><td class="r">${rupees(h.amount)}</td></tr>`).join('')}
      </tbody>
    </table>` : ''}

    <div class="note">
      ${cancelled ? 'This booking has been cancelled.' : balance > 0.009 ? `Please pay the balance of <strong>${rupees(balance)}</strong> before the trip. Reply to us on WhatsApp for payment details.` : 'Thank you! Your booking is fully paid. See you on the trail.'}
      Prices include ${gst}% GST.
    </div>
  </div>

  <div class="actions">
    <a class="print" href="./${esc(b.invoice_token || '')}/pdf?download=1">Download PDF</a>
    <button class="print" id="print-invoice" style="background:#0F3D36">Print</button>
  </div>
</div>
<script src="/invoice-print.js" defer></script>
</body>
</html>`;
}

const notFoundPage = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Invoice not found</title></head>
<body style="font-family:Arial,sans-serif;display:grid;place-items:center;min-height:90vh;color:#334"><div style="text-align:center"><h2>Invoice not found</h2><p>This invoice link is not valid. Please ask us for a new one.</p></div></body></html>`;

// Express handler: GET /invoice/:token
async function invoicePage(req, res) {
  try {
    const data = await loadInvoice(req.params.token);
    res.set('X-Robots-Tag', 'noindex, nofollow');
    if (!data) return res.status(404).type('html').send(notFoundPage);
    return res.type('html').send(renderInvoice(data));
  } catch (error) {
    console.error('Invoice page failed:', error?.message || error);
    return res.status(500).type('html').send('<p style="font-family:Arial">Invoice could not be loaded. Please try again.</p>');
  }
}

// File name the customer sees, e.g. Invoice-TFGW-2026-0030.pdf
const pdfFileName = (data) => `Invoice-${data.booking.booking_ref}.pdf`;

// Express handler: GET /invoice/:token/pdf  (?download=1 saves instead of opening)
async function invoicePdfPage(req, res) {
  try {
    const data = await loadInvoice(req.params.token);
    if (!data) return res.status(404).type('html').send(notFoundPage);
    // The saved invoice (store loaded here: it uses this file too)
    const saved = await require('./invoiceStore').getInvoicePdf(data.booking.id);
    if (!saved?.pdf) return res.status(404).type('html').send(notFoundPage);
    const disposition = req.query.download ? 'attachment' : 'inline';
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${saved.fileName}"`,
      'X-Robots-Tag': 'noindex, nofollow',
    });
    return res.send(saved.pdf);
  } catch (error) {
    console.error('Invoice PDF failed:', error?.message || error);
    return res.status(500).type('html').send('<p style="font-family:Arial">Invoice PDF could not be made. Please try again.</p>');
  }
}

module.exports = { invoicePage, invoicePdfPage, loadInvoiceByBookingId, buildInvoicePdf, pdfFileName };
