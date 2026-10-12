const { query, queryOne } = require('../db');
const {
  ok,
  pick,
  requireFields,
  badRequest,
  notFound,
  logActivity,
} = require('../utils/http');

const TRIP_FIELDS = [
  'slug', 'name', 'category_id', 'blurb', 'description', 'itinerary',
  'duration_label', 'duration_days', 'difficulty', 'distance_label',
  'price', 'without_transport_price', 'with_transport_price', 'price_note',
  'badge_text', 'badge_style', 'is_featured', 'featured_label',
  'featured_order', 'status',
];

const LIST_SQL = `
  SELECT t.id, t.slug, t.name, t.category_id, c.name AS category_name,
         t.duration_label, t.duration_days, t.difficulty, t.distance_label,
         t.price, t.without_transport_price, t.with_transport_price,
         t.is_featured, t.featured_label, t.status, t.updated_at,
         (SELECT COUNT(*) FROM departures d
           WHERE d.trip_id = t.id AND d.start_date >= CURDATE()) AS upcoming_departures,
         (SELECT COUNT(*) FROM bookings b
           WHERE b.trip_id = t.id AND b.status IN ('confirmed','completed')) AS bookings
  FROM trips t
  LEFT JOIN categories c ON c.id = t.category_id`;

function cleanTrip(body) {
  const data = pick(body, TRIP_FIELDS);

  if (data.slug !== undefined) {
    data.slug = String(data.slug || '').trim().toLowerCase();
    if (!/^[a-z0-9-]+$/.test(data.slug)) {
      throw badRequest('Slug can only use lowercase letters, numbers and "-" (it is also the image and brochure folder name)');
    }
  }

  if (data.is_featured !== undefined) data.is_featured = data.is_featured ? 1 : 0;
  return data;
}

exports.list = async (req, res) => {
  ok(res, await query(`${LIST_SQL} ORDER BY t.id DESC`));
};

exports.get = async (req, res) => {
  const trip = await queryOne('SELECT * FROM trips WHERE id = ?', [req.params.id]);
  if (!trip) throw notFound('Trip not found');
  ok(res, trip);
};

exports.create = async (req, res) => {
  requireFields(req.body, ['slug', 'name', 'category_id', 'blurb', 'duration_label', 'price']);
  const data = cleanTrip(req.body);

  if (await queryOne('SELECT id FROM trips WHERE slug = ?', [data.slug])) {
    throw badRequest('Another trip already uses this slug');
  }

  const result = await query('INSERT INTO trips SET ?', [data]);
  await logActivity(req, 'create', 'trip', result.insertId, data.name);
  ok(res, { id: result.insertId });
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const data = cleanTrip(req.body);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  if (data.slug && (await queryOne('SELECT id FROM trips WHERE slug = ? AND id <> ?', [data.slug, id]))) {
    throw badRequest('Another trip already uses this slug');
  }

  const result = await query('UPDATE trips SET ? WHERE id = ?', [data, id]);
  if (!result.affectedRows) throw notFound('Trip not found');

  await logActivity(req, 'update', 'trip', id, Object.keys(data).join(', '));
  ok(res, { id });
};
