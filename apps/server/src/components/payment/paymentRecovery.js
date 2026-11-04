// Payments PhonePe completed but the website never saw (the customer closed
// the page, PhonePe's status check was slow, no webhook arrived…).
// Every few minutes the server asks PhonePe again about recent payments that
// are still "processing", and books the paid ones. It also books payments
// already marked successful that have no booking yet.
// The admin can do the same for one order (Payments → Check PhonePe payment).
const { executeQuery } = require('../../db/connection');
const phonepeComponent = require('./phonepeComponent');
const paymentDbOps = require('../../db/paymentDbops');
const bookingDbOps = require('../../db/bookingDbops');

const EVERY_MS = 3 * 60 * 1000;

const queries = {
  // Older than 2 minutes (the customer may still be paying), at most a day old
  // (PhonePe expires unpaid orders long before that)
  stillProcessing: `
    SELECT merchant_order_id FROM phonepe_transactions
    WHERE status IN ('PROCESSING', 'PENDING')
      AND created_at < NOW() - INTERVAL 2 MINUTE
      AND created_at > NOW() - INTERVAL 1 DAY
    ORDER BY id LIMIT 20`,
  paidNotBooked: `
    SELECT t.merchant_order_id FROM phonepe_transactions t
    WHERE t.status = 'SUCCESS'
      AND t.created_at > NOW() - INTERVAL 3 DAY
      AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.merchant_order_id = t.merchant_order_id)
    ORDER BY t.id LIMIT 20`,
  bookingOf: 'SELECT id, booking_ref FROM bookings WHERE merchant_order_id = ?',
};

/**
 * Asks PhonePe about one order and books it when paid (never twice).
 * Returns { merchantOrderId, status, booking: { id, booking_ref } | null }.
 */
async function recoverPayment(merchantOrderId) {
  const id = String(merchantOrderId || '').trim();
  const transaction = await paymentDbOps.getTransactionByOrderId(id);
  if (!transaction) {
    throw Object.assign(new Error(`No website payment with the order ID ${id}`), { status: 404 });
  }
  // checkPaymentStatus saves PhonePe's answer and books a successful payment
  const { status } = await phonepeComponent.checkPaymentStatus(id);
  if (status === 'SUCCESS') {
    // A booking that failed before is tried again here
    await bookingDbOps.recordBooking(await paymentDbOps.getTransactionByOrderId(id))
      .catch((error) => console.error(`Booking ${id} failed:`, error?.message || error));
  }
  const booking = (await executeQuery(queries.bookingOf, [id]))[0] || null;
  return { merchantOrderId: id, status, booking };
}

let running = false;

async function sweep() {
  if (running) return;
  running = true;
  try {
    const [processing, paid] = await Promise.all([
      executeQuery(queries.stillProcessing),
      executeQuery(queries.paidNotBooked),
    ]);
    for (const { merchant_order_id: id } of [...processing, ...paid]) {
      try {
        const result = await recoverPayment(id);
        if (result.booking) console.log(`Payment recovery: ${id} is ${result.status}, booking ${result.booking.booking_ref}`);
      } catch (error) {
        console.error(`Payment recovery failed for ${id}:`, error?.message || error);
      }
    }
  } catch (error) {
    console.error('Payment recovery sweep failed:', error?.message || error);
  } finally {
    running = false;
  }
}

// Started once by server.js (also runs shortly after a restart / wake-up)
function startPaymentRecovery() {
  setTimeout(sweep, 30 * 1000);
  setInterval(sweep, EVERY_MS).unref();
}

module.exports = { recoverPayment, startPaymentRecovery };
