// Payments screen (PhonePe + offline).
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');

// Returns { data: { online, offline }, stats }
async function getPayments() {
  const { online, offline, stats } = await dbops.getPayments();
  const offlineAmount = offline.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  return {
    data: { online, offline },
    stats: { ...stats, offline_amount: offlineAmount, offline_count: offline.length },
  };
}

module.exports = {
  getPayments,
};
