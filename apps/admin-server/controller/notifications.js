const { query, queryOne } = require('../db');
const { modulesForRole } = require('../middleware/auth');
const { ok } = require('../utils/http');

// Each alert feed: who may see it (module) and how it is read, newest first
const FEEDS = {
  // A customer booked and paid on the website
  booking: {
    module: 'bookings',
    items: `
      SELECT b.id, b.booking_ref, c.name, c.phone, t.name AS trip_name,
             b.trek_start_date, b.people, b.amount_paid, b.balance_amount,
             b.payment_type, b.booked_at AS at
      FROM bookings b
      JOIN customers c ON c.id = b.customer_id
      LEFT JOIN trips t ON t.id = b.trip_id
      WHERE b.merchant_order_id IS NOT NULL
      ORDER BY b.id DESC
      LIMIT 20`,
    latest: 'SELECT COALESCE(MAX(id), 0) AS id FROM bookings WHERE merchant_order_id IS NOT NULL',
  },
  // Someone downloaded a brochure (with their contact details)
  brochure: {
    module: 'brochures',
    items: `
      SELECT bd.id, bd.name, bd.phone, t.name AS trip_name, bd.downloaded_at AS at
      FROM brochure_downloads bd
      LEFT JOIN trips t ON t.id = bd.trip_id
      ORDER BY bd.id DESC
      LIMIT 20`,
    latest: 'SELECT COALESCE(MAX(id), 0) AS id FROM brochure_downloads',
  },
  // Someone clicked "Interested" on a featured trip (anonymous)
  interest: {
    module: 'brochures',
    items: `
      SELECT ti.id, ti.trip_id, t.name AS trip_name, ti.created_at AS at,
             (SELECT COUNT(*) FROM trip_interests x
               WHERE x.trip_id = ti.trip_id AND x.type = 'interested') AS trip_total
      FROM trip_interests ti
      LEFT JOIN trips t ON t.id = ti.trip_id
      WHERE ti.type = 'interested'
      ORDER BY ti.id DESC
      LIMIT 20`,
    latest: "SELECT COALESCE(MAX(id), 0) AS id FROM trip_interests WHERE type = 'interested'",
  },
};

// Returns only the feeds this user's role may see
exports.list = async (req, res) => {
  const modules = modulesForRole(req.admin.role);
  const types = Object.keys(FEEDS).filter((type) => modules.includes(FEEDS[type].module));

  const results = await Promise.all(
    types.map(async (type) => {
      const [items, latest] = await Promise.all([
        query(FEEDS[type].items),
        queryOne(FEEDS[type].latest),
      ]);
      return [type, { items, latestId: Number(latest.id) }];
    })
  );

  ok(res, Object.fromEntries(results));
};
