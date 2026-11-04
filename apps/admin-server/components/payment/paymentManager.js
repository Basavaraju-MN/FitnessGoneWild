// Payments screen (PhonePe + offline).
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const { badRequest, logActivity } = require('../../utils/http');
const { recoverPayment } = require('../../../server/src/components/payment/paymentRecovery');

// Returns { data: { online, offline }, stats }
async function getPayments() {
  const { online, offline, stats } = await dbops.getPayments();
  const offlineAmount = offline.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return {
    data: { online, offline },
    stats: { ...stats, offline_amount: offlineAmount, offline_count: offline.length },
  };
}

/**
 * A website payment PhonePe shows as paid but the website still has as
 * "processing" (or with no booking): ask PhonePe again and book it.
 * The server also does this by itself every few minutes.
 */
async function checkPhonePePayment(admin, merchantOrderId) {
  const id = String(merchantOrderId || '').trim();
  if (!/^[A-Za-z0-9_-]{6,100}$/.test(id)) throw badRequest('Enter the merchant order ID, e.g. FGW_1793806865382_3c0993e9d683');
  const result = await recoverPayment(id);
  await logActivity(admin, 'check', 'payment', null,
    `${id}: ${result.status}${result.booking ? ` · booking ${result.booking.booking_ref}` : ''}`);
  return result;
}

module.exports = {
  checkPhonePePayment,
  getPayments,
};
