const { query } = require('../db');
const { ok } = require('../utils/http');

// Small lists used by dropdowns across the admin
exports.all = async (req, res) => {
  const [trips, categories, guides, vehicles, drivers, pickupPoints, users] = await Promise.all([
    query("SELECT id, name, slug, category_id, with_transport_price, without_transport_price, price FROM trips ORDER BY name"),
    query('SELECT id, name FROM categories ORDER BY sort_order, id'),
    query('SELECT id, name, phone FROM guides WHERE is_active = 1 ORDER BY name'),
    query('SELECT id, vehicle_number, vehicle_type FROM vehicles WHERE is_active = 1 ORDER BY vehicle_number'),
    query('SELECT id, name, phone FROM drivers WHERE is_active = 1 ORDER BY name'),
    query('SELECT id, trip_id, name, address FROM pickup_points WHERE is_active = 1 ORDER BY sort_order, name'),
    query('SELECT id, full_name, role FROM admin_users WHERE is_active = 1 ORDER BY full_name'),
  ]);

  ok(res, { trips, categories, guides, vehicles, drivers, pickupPoints, users });
};
