// Refunds on cancelled bookings: start a PhonePe refund (money goes back to
// the customer's original UPI / card) or record one paid back by hand.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const { badRequest, notFound, toMoney, logActivity } = require('../../utils/http');
const { PAYMENT_METHODS } = require('../common/rules');
const phonepe = require('./phonepe');

// Cancellation policy (as on the website): full refund up to 7 days before
// departure, 50% up to 3 days before, nothing after that
function policyFor(startDate) {
  if (!startDate) return { percent: 100, note: 'No travel date' };
  const today = new Date(new Date().toDateString());
  const days = Math.round((new Date(`${String(startDate).slice(0, 10)}T00:00:00`) - today) / 86400000);
  if (days >= 7) return { percent: 100, days, note: `${days} days before the trip: full refund` };
  if (days >= 3) return { percent: 50, days, note: `${days} days before the trip: 50% refund` };
  return { percent: 0, days, note: days >= 0 ? `${days} day(s) before the trip: no refund as per policy` : 'Trip date has passed: no refund as per policy' };
}

// What can still be refunded, and how much of it through PhonePe
async function refundInfo(booking, refunds) {
  const list = refunds || (await dbops.getBookingRefunds(booking.id));
  const active = list.filter((r) => r.state !== 'failed');
  const sum = (rows) => toMoney(rows.reduce((s, r) => s + Number(r.amount), 0));

  const paid = Number(booking.amount_paid);
  const refundable = toMoney(paid - sum(active));

  // Paid online = what PhonePe holds (payments recorded in the admin are not)
  const recordedInAdmin = booking.merchant_order_id ? await dbops.getRecordedPaymentsTotal(booking.id) : paid;
  const paidOnline = toMoney(paid - recordedInAdmin);
  const phonepeRefundable = toMoney(Math.min(refundable, paidOnline - sum(active.filter((r) => r.mode === 'phonepe'))));

  // The cancellation policy only applies to cancelled bookings; on an active
  // booking a refund is partial (e.g. one person dropped out)
  const policy = booking.status === 'cancelled'
    ? policyFor(booking.trek_start_date)
    : { percent: null, note: 'Booking is still active: partial refund (e.g. a person dropped out)' };
  return {
    paid,
    refunded: sum(list.filter((r) => r.state === 'completed')),
    pending: sum(list.filter((r) => r.state === 'pending')),
    refundable: Math.max(0, refundable),
    paidOnline: Math.max(0, paidOnline),
    phonepeRefundable: Math.max(0, phonepeRefundable),
    canPhonePe: Boolean(booking.merchant_order_id) && phonepeRefundable > 0,
    policyPercent: policy.percent,
    policyNote: policy.note,
    suggested: policy.percent == null ? null : toMoney(Math.min(refundable, (paid * policy.percent) / 100)),
  };
}

async function getRefundsForBooking(booking) {
  const refunds = await dbops.getBookingRefunds(booking.id);
  return { refunds, refundInfo: await refundInfo(booking, refunds) };
}

// Start a refund. mode: 'phonepe' or 'manual'
async function createRefund(admin, bookingId, body = {}) {
  const booking = await dbops.getBookingRow(bookingId);
  if (!booking) throw notFound('Booking not found');

  const info = await refundInfo(booking);
  const amount = toMoney(body.amount);
  const mode = body.mode === 'phonepe' ? 'phonepe' : 'manual';

  if (amount <= 0) throw badRequest('Refund must be more than 0');
  if (amount > info.refundable + 0.009) throw badRequest(`Only ₹${info.refundable} can still be refunded`);

  const reason = body.reason ? String(body.reason).slice(0, 500) : null;

  if (mode === 'manual') {
    const method = body.method || 'upi';
    if (!PAYMENT_METHODS.includes(method)) throw badRequest('Unknown refund method');

    const id = await dbops.createRefund({
      bookingId: booking.id, amount, mode, method, state: 'completed',
      reference: body.reference, reason, initiatedBy: admin.id,
      completedAt: body.refunded_at || new Date(),
    });
    await dbops.updateBookingRefundTotals(booking.id);
    await logActivity(admin, 'refund', 'booking', booking.id, `₹${amount} via ${method} (manual)`);
    return { id, state: 'completed' };
  }

  // PhonePe: back to the customer's original payment
  if (!booking.merchant_order_id) throw badRequest('This booking was not paid through PhonePe');
  if (amount > info.phonepeRefundable + 0.009) {
    throw badRequest(`Only ₹${info.phonepeRefundable} was paid online and can go back through PhonePe`);
  }

  const merchantRefundId = `RF_${booking.id}_${Date.now()}`;
  const id = await dbops.createRefund({
    bookingId: booking.id, amount, mode, method: 'phonepe', state: 'pending',
    merchantRefundId, reason, initiatedBy: admin.id,
  });

  try {
    const result = await phonepe.startRefund({ merchantRefundId, merchantOrderId: booking.merchant_order_id, amount });
    await dbops.updateRefundState(id, result);
    await dbops.updateBookingRefundTotals(booking.id);
    await logActivity(admin, 'refund', 'booking', booking.id, `₹${amount} via PhonePe · ${merchantRefundId} · ${result.state}`);
    return { id, state: result.state, merchantRefundId };
  } catch (error) {
    await dbops.updateRefundState(id, { state: 'failed', error: error.message.slice(0, 500) });
    throw error;
  }
}

// Ask PhonePe how a pending refund is doing
async function checkRefund(id) {
  const refund = await dbops.getRefund(id);
  if (!refund) throw notFound('Refund not found');
  if (refund.mode !== 'phonepe' || refund.state !== 'pending') return refund;

  const result = await phonepe.refundStatus(refund.merchant_refund_id);
  await dbops.updateRefundState(refund.id, result);
  await dbops.updateBookingRefundTotals(refund.booking_id);
  return dbops.getRefund(refund.id);
}

const getRefunds = () => dbops.getRefunds();

// Pending PhonePe refunds are checked in the background
let timer = null;
function startRefundChecks(minutes = 15) {
  if (timer) return;
  const run = async () => {
    try {
      for (const refund of await dbops.getPendingPhonePeRefunds()) {
        await checkRefund(refund.id).catch((error) => console.error(`Refund ${refund.id} check failed:`, error.message));
      }
    } catch (error) {
      console.error('Refund checks failed:', error.message);
    }
  };
  setTimeout(run, 90 * 1000).unref();
  timer = setInterval(run, minutes * 60 * 1000);
  timer.unref();
}

module.exports = {
  getRefundsForBooking,
  createRefund,
  checkRefund,
  getRefunds,
  startRefundChecks,
};
