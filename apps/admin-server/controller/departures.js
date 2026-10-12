const { query, queryOne } = require('../db');
const {
  ok,
  pick,
  requireFields,
  badRequest,
  notFound,
  isDate,
  logActivity,
} = require('../utils/http');

const ACTIVE = "b.status IN ('confirmed','completed')";

const DEPARTURE_FIELDS = [
  'trip_id', 'start_date', 'end_date', 'departure_type', 'seats_total',
  'status', 'guide_id', 'vehicle_id', 'driver_id', 'trip_status',
  'price_override', 'notes',
];

const LIST_SQL = `
  SELECT d.id, d.trip_id, t.name AS trip_name, t.slug,
         d.start_date, d.end_date, d.departure_type, d.seats_total, d.seats_booked,
         d.status, d.trip_status, d.notes,
         d.guide_id, g.name AS guide_name, g.phone AS guide_phone,
         d.vehicle_id, v.vehicle_number, v.vehicle_type,
         d.driver_id, dr.name AS driver_name, dr.phone AS driver_phone,
         COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.people END), 0) AS people,
         COALESCE(SUM(CASE WHEN ${ACTIVE} THEN 1 END), 0) AS bookings,
         COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.amount END), 0) AS total_amount,
         COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.amount_paid END), 0) AS paid_amount,
         COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.balance_amount END), 0) AS pending_amount
  FROM departures d
  JOIN trips t ON t.id = d.trip_id
  LEFT JOIN guides g ON g.id = d.guide_id
  LEFT JOIN vehicles v ON v.id = d.vehicle_id
  LEFT JOIN drivers dr ON dr.id = d.driver_id
  LEFT JOIN bookings b ON b.departure_id = d.id`;

function cleanDeparture(body) {
  const data = pick(body, DEPARTURE_FIELDS);

  for (const key of ['start_date', 'end_date']) {
    if (data[key] !== undefined && data[key] !== null && !isDate(data[key])) {
      throw badRequest(`${key} must be YYYY-MM-DD`);
    }
  }

  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    throw badRequest('Return date cannot be before the travel date');
  }

  return data;
}

exports.list = async (req, res) => {
  const where = [];
  const params = [];

  // ?when=upcoming (default) | past | all
  const when = req.query.when || 'upcoming';
  if (when === 'upcoming') where.push("(d.end_date >= CURDATE() OR d.trip_status IN ('upcoming','ongoing'))");
  if (when === 'past') where.push('d.end_date < CURDATE()');

  if (req.query.trip_id) {
    where.push('d.trip_id = ?');
    params.push(req.query.trip_id);
  }

  const sql = `${LIST_SQL}
    ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    GROUP BY d.id
    ORDER BY d.start_date ${when === 'past' ? 'DESC' : 'ASC'}`;

  ok(res, await query(sql, params));
};

exports.get = async (req, res) => {
  const departure = await queryOne(`${LIST_SQL} WHERE d.id = ? GROUP BY d.id`, [req.params.id]);
  if (!departure) throw notFound('Trip coordination not found');

  const customers = await query(`
    SELECT b.id, b.booking_ref, b.status, b.payment_status, b.people,
           b.with_transport_people, b.without_transport_people, b.travel_mode,
           b.amount, b.amount_paid, b.balance_amount, b.payment_type, b.notes,
           c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           p.name AS pickup_name
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN pickup_points p ON p.id = b.pickup_point_id
    WHERE b.departure_id = ?
    ORDER BY b.status = 'cancelled', p.sort_order, c.name`, [req.params.id]);

  ok(res, { ...departure, customers });
};

exports.create = async (req, res) => {
  requireFields(req.body, ['trip_id', 'start_date']);
  const data = cleanDeparture(req.body);
  data.end_date = data.end_date || data.start_date;
  data.departure_type = data.departure_type || 'scheduled';

  const existing = await queryOne(
    'SELECT id FROM departures WHERE trip_id = ? AND start_date = ? AND end_date = ? AND departure_type = ?',
    [data.trip_id, data.start_date, data.end_date, data.departure_type]
  );
  if (existing) throw badRequest(`This trip already has a coordination for these dates (#${existing.id})`);

  const result = await query('INSERT INTO departures SET ?', [data]);
  await logActivity(req, 'create', 'departure', result.insertId, `${data.start_date} → ${data.end_date}`);
  ok(res, { id: result.insertId });
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const data = cleanDeparture(req.body);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  const result = await query('UPDATE departures SET ? WHERE id = ?', [data, id]);
  if (!result.affectedRows) throw notFound('Trip coordination not found');

  await logActivity(req, 'update', 'departure', id, Object.keys(data).join(', '));
  ok(res, { id });
};
