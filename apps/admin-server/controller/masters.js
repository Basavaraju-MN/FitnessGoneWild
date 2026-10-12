const { query } = require('../db');
const {
  ok,
  pick,
  requireFields,
  badRequest,
  notFound,
  logActivity,
} = require('../utils/http');

// One definition per master table: editable columns, required ones,
// and how the list is read.
const MASTERS = {
  guides: {
    table: 'guides',
    fields: ['name', 'phone', 'email', 'notes', 'is_active'],
    required: ['name'],
    list: 'SELECT * FROM guides ORDER BY is_active DESC, name',
  },
  vehicles: {
    table: 'vehicles',
    fields: ['vehicle_number', 'vehicle_type', 'seats', 'provider', 'provider_phone', 'notes', 'is_active'],
    required: ['vehicle_number'],
    list: 'SELECT * FROM vehicles ORDER BY is_active DESC, vehicle_number',
  },
  drivers: {
    table: 'drivers',
    fields: ['name', 'phone', 'license_number', 'notes', 'is_active'],
    required: ['name'],
    list: 'SELECT * FROM drivers ORDER BY is_active DESC, name',
  },
  'pickup-points': {
    table: 'pickup_points',
    fields: ['trip_id', 'name', 'address', 'map_url', 'sort_order', 'is_active'],
    required: ['trip_id', 'name'],
    list: `SELECT p.*, t.name AS trip_name
           FROM pickup_points p LEFT JOIN trips t ON t.id = p.trip_id
           ORDER BY t.name, p.sort_order, p.name`,
  },
  categories: {
    table: 'categories',
    fields: ['slug', 'name', 'label', 'sort_order', 'is_active'],
    required: ['slug', 'name', 'label'],
    list: 'SELECT * FROM categories ORDER BY sort_order, id',
  },
};

function getMaster(type) {
  const master = MASTERS[type];
  if (!master) throw notFound('Unknown master data type');
  return master;
}

function clean(master, body) {
  const data = pick(body, master.fields);
  if (data.is_active !== undefined) data.is_active = data.is_active ? 1 : 0;
  return data;
}

function duplicateMessage(error) {
  return error?.code === 'ER_DUP_ENTRY'
    ? badRequest('A record with the same name/number already exists')
    : error;
}

exports.list = async (req, res) => {
  ok(res, await query(getMaster(req.params.type).list));
};

exports.create = async (req, res) => {
  const master = getMaster(req.params.type);
  requireFields(req.body, master.required);

  try {
    const result = await query(`INSERT INTO ${master.table} SET ?`, [clean(master, req.body)]);
    await logActivity(req, 'create', master.table, result.insertId);
    ok(res, { id: result.insertId });
  } catch (error) {
    throw duplicateMessage(error);
  }
};

exports.update = async (req, res) => {
  const master = getMaster(req.params.type);
  const data = clean(master, req.body);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  try {
    const result = await query(`UPDATE ${master.table} SET ? WHERE id = ?`, [data, req.params.id]);
    if (!result.affectedRows) throw notFound();
    await logActivity(req, 'update', master.table, req.params.id, Object.keys(data).join(', '));
    ok(res, { id: Number(req.params.id) });
  } catch (error) {
    throw duplicateMessage(error);
  }
};
