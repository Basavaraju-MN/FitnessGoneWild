// Master Data screen (guides, vehicles, drivers, pickup points, categories).
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const {
  badRequest,
  notFound,
  pick,
  requireFields,
  logActivity,
} = require('../../utils/http');

// URL name -> table, editable columns, required columns
const MASTERS = {
  guides: { table: 'guides', fields: ['name', 'phone', 'email', 'notes', 'is_active'], required: ['name'] },
  vehicles: {
    table: 'vehicles',
    fields: ['vehicle_number', 'vehicle_type', 'seats', 'provider', 'provider_phone', 'notes', 'is_active'],
    required: ['vehicle_number'],
  },
  drivers: { table: 'drivers', fields: ['name', 'phone', 'license_number', 'notes', 'is_active'], required: ['name'] },
  'pickup-points': {
    table: 'pickup_points',
    fields: ['trip_id', 'name', 'address', 'map_url', 'sort_order', 'is_active'],
    required: ['trip_id', 'name'],
  },
  categories: {
    table: 'categories',
    fields: ['slug', 'name', 'label', 'sort_order', 'is_active'],
    required: ['slug', 'name', 'label'],
  },
};

function getMaster(type) {
  const master = MASTERS[type];
  if (!master) throw notFound('Unknown master data type');
  return master;
}

function cleanMaster(master, body) {
  const data = pick(body, master.fields);
  if (data.is_active !== undefined) data.is_active = data.is_active ? 1 : 0;
  return data;
}

const duplicateError = (error) =>
  error?.code === 'ER_DUP_ENTRY' ? badRequest('A record with the same name/number already exists') : error;

const getMasterList = (type) => dbops.getMasterList(getMaster(type).table);

async function createMaster(admin, type, body) {
  const master = getMaster(type);
  requireFields(body, master.required);

  try {
    const id = await dbops.createMaster(master.table, cleanMaster(master, body));
    await logActivity(admin, 'create', master.table, id);
    return { id };
  } catch (error) {
    throw duplicateError(error);
  }
}

async function updateMaster(admin, type, id, body) {
  const master = getMaster(type);
  const data = cleanMaster(master, body);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  try {
    if (!(await dbops.updateMaster(master.table, id, data))) throw notFound();
  } catch (error) {
    throw duplicateError(error);
  }

  await logActivity(admin, 'update', master.table, id, Object.keys(data).join(', '));
  return { id };
}

module.exports = {
  getMasterList,
  createMaster,
  updateMaster,
};
