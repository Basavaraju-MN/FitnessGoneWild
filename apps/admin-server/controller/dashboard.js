const { query, queryOne } = require('../db');
const { ok } = require('../utils/http');

// Booking statuses that count as real business
const ACTIVE_BOOKING = "b.status IN ('confirmed','completed')";

exports.summary = async (req, res) => {
  const role = req.admin.role;

  const [
    bookingTotals,
    customerCount,
    upcomingDepartures,
    enquiryCounts,
    brochureCounts,
    revenue,
    upcoming,
    activity,
  ] = await Promise.all([
    queryOne(`
      SELECT COUNT(*) AS bookings,
             COALESCE(SUM(b.people), 0) AS people,
             COALESCE(SUM(b.amount_paid), 0) AS collected,
             COALESCE(SUM(b.balance_amount), 0) AS pending,
             COALESCE(SUM(CASE WHEN b.booked_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END), 0) AS bookingsThisMonth
      FROM bookings b WHERE ${ACTIVE_BOOKING}`),
    queryOne('SELECT COUNT(*) AS total FROM customers'),
    queryOne(`
      SELECT COUNT(*) AS total,
             COALESCE(SUM(CASE WHEN start_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END), 0) AS thisWeek,
             COALESCE(SUM(CASE WHEN guide_id IS NULL OR vehicle_id IS NULL OR driver_id IS NULL THEN 1 ELSE 0 END), 0) AS needsTeam
      FROM departures
      WHERE start_date >= CURDATE() AND trip_status IN ('upcoming','ongoing')`),
    queryOne(`
      SELECT COALESCE(SUM(status = 'new'), 0) AS newCount,
             COALESCE(SUM(status = 'contacted'), 0) AS contacted,
             COALESCE(SUM(status = 'interested'), 0) AS interested,
             COALESCE(SUM(status = 'booked'), 0) AS booked
      FROM enquiries`),
    queryOne(`
      SELECT COUNT(*) AS total,
             COALESCE(SUM(DATE(downloaded_at) = CURDATE()), 0) AS today,
             COALESCE(SUM(follow_up_status = 'not_contacted'), 0) AS notContacted,
             COALESCE(SUM(follow_up_status = 'converted'), 0) AS converted
      FROM brochure_downloads`),
    query(`
      SELECT DATE_FORMAT(b.booked_at, '%Y-%m') AS month,
             COALESCE(SUM(b.amount_paid), 0) AS collected,
             COUNT(*) AS bookings
      FROM bookings b
      WHERE ${ACTIVE_BOOKING}
        AND b.booked_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
      GROUP BY month ORDER BY month`),
    query(`
      SELECT d.id, t.name AS trip_name, d.start_date, d.end_date, d.trip_status,
             g.name AS guide_name, v.vehicle_number, dr.name AS driver_name,
             COALESCE(SUM(CASE WHEN ${ACTIVE_BOOKING} THEN b.people END), 0) AS people,
             COALESCE(SUM(CASE WHEN ${ACTIVE_BOOKING} THEN b.balance_amount END), 0) AS pending
      FROM departures d
      JOIN trips t ON t.id = d.trip_id
      LEFT JOIN guides g ON g.id = d.guide_id
      LEFT JOIN vehicles v ON v.id = d.vehicle_id
      LEFT JOIN drivers dr ON dr.id = d.driver_id
      LEFT JOIN bookings b ON b.departure_id = d.id
      WHERE d.start_date >= CURDATE() AND d.trip_status IN ('upcoming','ongoing')
      GROUP BY d.id
      ORDER BY d.start_date
      LIMIT 6`),
    query(`
      SELECT * FROM (
        SELECT 'enquiry' AS type, e.name AS title, COALESCE(t.name, '') AS detail, e.received_at AS at
          FROM enquiries e LEFT JOIN trips t ON t.id = e.trip_id
        UNION ALL
        SELECT 'booking', c.name, CONCAT(b.booking_ref, ' · ', COALESCE(t.name, '')), b.booked_at
          FROM bookings b JOIN customers c ON c.id = b.customer_id LEFT JOIN trips t ON t.id = b.trip_id
        UNION ALL
        SELECT 'brochure', bd.name, COALESCE(t.name, ''), bd.downloaded_at
          FROM brochure_downloads bd LEFT JOIN trips t ON t.id = bd.trip_id
        UNION ALL
        SELECT 'payment', COALESCE(c.name, ''), CONCAT('₹', bp.amount, ' · ', b.booking_ref), bp.paid_at
          FROM booking_payments bp
          JOIN bookings b ON b.id = bp.booking_id
          LEFT JOIN customers c ON c.id = b.customer_id
      ) feed
      ORDER BY at DESC
      LIMIT 8`),
  ]);

  const cards = {
    admin: [
      ['Total Customers', customerCount.total, 'All customers and leads'],
      ['Total Bookings', bookingTotals.bookings, `${bookingTotals.bookingsThisMonth} this month`],
      ['Collected', `₹${Number(bookingTotals.collected).toLocaleString('en-IN')}`, 'Paid on confirmed bookings'],
      ['Upcoming Trips', upcomingDepartures.total, `${upcomingDepartures.thisWeek} in the next 7 days`],
    ],
    sales: [
      ['New Enquiries', enquiryCounts.newCount, `${enquiryCounts.contacted} contacted`],
      ['Brochure Leads', brochureCounts.total, `${brochureCounts.notContacted} not contacted`],
      ['Interested', enquiryCounts.interested, 'Potential bookings'],
      ['Conversions', Number(enquiryCounts.booked) + Number(brochureCounts.converted), 'Leads that booked'],
    ],
    operations: [
      ['Upcoming Trips', upcomingDepartures.total, `${upcomingDepartures.thisWeek} in the next 7 days`],
      ['Customers Going', bookingTotals.people, 'On confirmed bookings'],
      ['Amount Pending', `₹${Number(bookingTotals.pending).toLocaleString('en-IN')}`, 'Balance to collect'],
      ['Team Pending', upcomingDepartures.needsTeam, 'Guide / vehicle / driver missing'],
    ],
  };

  ok(res, {
    cards: cards[role] || cards.admin,
    revenue,
    upcoming,
    activity,
    sales: { enquiryCounts, brochureCounts },
  });
};
