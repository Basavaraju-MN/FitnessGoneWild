// Dashboard screen: cards, collections, upcoming trips, activity.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');

async function getDashboard(admin) {
  const d = await dbops.getDashboardData();
  const rupees = (value) => `₹${Number(value).toLocaleString('en-IN')}`;

  const cards = {
    admin: [
      ['Total Customers', d.customerCount.total, 'All customers and leads'],
      ['Total Bookings', d.bookingTotals.bookings, `${d.bookingTotals.bookingsThisMonth} this month`],
      ['Collected', rupees(d.bookingTotals.collected), 'Paid on confirmed bookings'],
      ['Upcoming Trips', d.upcomingCounts.total, `${d.upcomingCounts.thisWeek} in the next 7 days`],
    ],
    sales: [
      ['New Enquiries', d.enquiryCounts.newCount, `${d.enquiryCounts.contacted} contacted`],
      ['Brochure Leads', d.brochureCounts.total, `${d.brochureCounts.notContacted} not contacted`],
      ['Interested', d.enquiryCounts.interested, 'Potential bookings'],
      ['Conversions', Number(d.enquiryCounts.booked) + Number(d.brochureCounts.converted), 'Leads that booked'],
    ],
    operations: [
      ['Upcoming Trips', d.upcomingCounts.total, `${d.upcomingCounts.thisWeek} in the next 7 days`],
      ['Customers Going', d.bookingTotals.people, 'On confirmed bookings'],
      ['Amount Pending', rupees(d.bookingTotals.pending), 'Balance to collect'],
      ['Team Pending', d.upcomingCounts.needsTeam, 'Guide / vehicle / driver missing'],
    ],
  };

  return {
    cards: cards[admin.role] || cards.admin,
    revenue: d.revenue,
    upcoming: d.upcoming,
    activity: d.activity,
    sales: { enquiryCounts: d.enquiryCounts, brochureCounts: d.brochureCounts },
  };
}

module.exports = {
  getDashboard,
};
