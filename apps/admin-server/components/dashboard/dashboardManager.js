// Dashboard screen: cards, collections, upcoming trips.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');

async function getDashboard(admin) {
  const d = await dbops.getDashboardData();
  const rupees = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

  const cards = {
    admin: [
      ['Total Events', d.events.total, `${d.events.upcoming} upcoming · ${d.events.done} done`],
      ['Total Revenue', rupees(d.money.total), `${rupees(d.money.thisMonth)} this month`],
      ["Today's Revenue", rupees(d.money.today), `${d.money.todayPayments} payment${Number(d.money.todayPayments) === 1 ? '' : 's'} today`],
      ['Pending Settlement', rupees(d.bookingTotals.pending), `Balance due on ${d.bookingTotals.pendingBookings} booking${Number(d.bookingTotals.pendingBookings) === 1 ? '' : 's'}`],
      ['Total Bookings', d.bookingTotals.bookings, `${d.bookingTotals.bookingsThisMonth} this month`],
      ["Today's Bookings", d.bookingTotals.bookingsToday, `${d.bookingTotals.peopleToday} people`],
      ['Refunded', rupees(d.refunds.refunded), [
        Number(d.refunds.inProcessCount) ? `${rupees(d.refunds.inProcess)} in process` : '',
        Number(d.refunds.dueCount) ? `${d.refunds.dueCount} cancelled to refund` : '',
      ].filter(Boolean).join(' · ') || `${d.refunds.refundedCount} booking${Number(d.refunds.refundedCount) === 1 ? '' : 's'} refunded`],
      ['Total Customers', d.customerCount.total, 'Booked and paid (advance or full)'],
    ],
    sales: [
      ['New Enquiries', d.enquiryCounts.newCount, 'Need a first call'],
      ['Brochure Leads', d.brochureCounts.total, `${d.brochureCounts.notContacted} not contacted`],
      ['In Progress', d.enquiryCounts.inProgress, 'Being followed up'],
      ['Conversions', d.enquiryCounts.booked, `${d.enquiryCounts.lost} lost / closed`],
    ],
    operations: [
      ['Upcoming Trips', d.upcomingCounts.total, `${d.upcomingCounts.thisWeek} in the next 7 days`],
      ['Customers Going', d.bookingTotals.people, 'On confirmed bookings'],
      ['Amount Pending', rupees(d.bookingTotals.pending), 'Balance to collect'],
      ['Guide Pending', d.upcomingCounts.needsTeam, 'No guide assigned yet'],
    ],
  };

  return {
    cards: cards[admin.role] || cards.admin,
    revenue: d.revenue,
    upcoming: d.upcoming,
    sales: { enquiryCounts: d.enquiryCounts, brochureCounts: d.brochureCounts },
  };
}

module.exports = {
  getDashboard,
};
