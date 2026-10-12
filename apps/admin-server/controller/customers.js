const { query, queryOne } = require('../db');
const { ok, pick, badRequest, notFound, logActivity } = require('../utils/http');

exports.list = async (req, res) => {
  ok(res, await query(`
    SELECT c.id, c.name, c.phone, c.email, c.city, c.created_at,
           COUNT(b.id) AS bookings,
           COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.amount_paid END), 0) AS total_spent,
           COALESCE(SUM(CASE WHEN b.status IN ('confirmed','completed') THEN b.balance_amount END), 0) AS balance_due,
           MAX(b.trek_start_date) AS last_trip_date,
           (SELECT COUNT(*) FROM brochure_downloads bd WHERE bd.customer_id = c.id) AS brochure_downloads
    FROM customers c
    LEFT JOIN bookings b ON b.customer_id = c.id
    GROUP BY c.id
    ORDER BY c.id DESC
    LIMIT 5000`));
};

exports.get = async (req, res) => {
  const customer = await queryOne('SELECT * FROM customers WHERE id = ?', [req.params.id]);
  if (!customer) throw notFound('Customer not found');

  const [bookings, downloads, enquiries] = await Promise.all([
    query(`
      SELECT b.id, b.booking_ref, t.name AS trip_name, b.trek_start_date, b.people,
             b.amount, b.amount_paid, b.balance_amount, b.status, b.payment_status
      FROM bookings b LEFT JOIN trips t ON t.id = b.trip_id
      WHERE b.customer_id = ? ORDER BY b.booked_at DESC`, [customer.id]),
    query(`
      SELECT bd.id, t.name AS trip_name, bd.follow_up_status, bd.downloaded_at
      FROM brochure_downloads bd LEFT JOIN trips t ON t.id = bd.trip_id
      WHERE bd.customer_id = ? OR bd.phone = ? ORDER BY bd.downloaded_at DESC`, [customer.id, customer.phone]),
    query(`
      SELECT e.id, t.name AS trip_name, e.status, e.received_at, e.note
      FROM enquiries e LEFT JOIN trips t ON t.id = e.trip_id
      WHERE e.customer_id = ? OR e.phone = ? ORDER BY e.received_at DESC`, [customer.id, customer.phone]),
  ]);

  ok(res, { ...customer, bookings, downloads, enquiries });
};

exports.update = async (req, res) => {
  const data = pick(req.body, ['name', 'phone', 'email', 'city']);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  const result = await query('UPDATE customers SET ? WHERE id = ?', [data, req.params.id]);
  if (!result.affectedRows) throw notFound('Customer not found');

  await logActivity(req, 'update', 'customer', req.params.id, Object.keys(data).join(', '));
  ok(res, { id: Number(req.params.id) });
};
