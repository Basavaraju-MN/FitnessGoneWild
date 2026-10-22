// Guides and Pickup Points screens, categories (Treks & Trips screen) and
// lead statuses (Enquiries & Leads → Manage statuses).
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
  'pickup-points': {
    table: 'pickup_points',
    fields: ['trip_id', 'city_id', 'name', 'address', 'map_url', 'sort_order', 'is_active'],
    required: ['trip_id', 'city_id', 'name'],
  },
  // Website "Select region": South India, North India …; each can show only some tabs
  regions: {
    table: 'regions',
    fields: ['slug', 'name', 'tagline', 'image_path', 'sort_order', 'is_active'],
    required: ['name'],
    // The slug is made from the name once
    beforeCreate: (data) => ({
      ...data,
      slug: String(data.slug || data.name).toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60),
    }),
    beforeUpdate: (data) => {
      const { slug: _ignored, ...rest } = data;
      return rest;
    },
    // category_ids: [3, 1] = show these tabs in this order; [] = every tab
    afterSave: async (id, body) => {
      if (body.category_ids === undefined) return;
      const ids = (Array.isArray(body.category_ids) ? body.category_ids : String(body.category_ids || '').split(','))
        .map(Number).filter(Boolean);
      await dbops.setRegionCategories(id, [...new Set(ids)]);
    },
  },
  // Website "Departing from": a trek leaves from every city it has pickup points in
  'departure-cities': {
    table: 'departure_cities',
    fields: ['name', 'state', 'sort_order', 'is_active'],
    required: ['name'],
  },
  categories: {
    table: 'categories',
    fields: ['slug', 'name', 'label', 'sort_order', 'is_active'],
    required: ['slug', 'name', 'label'],
  },
  'lead-statuses': {
    table: 'lead_statuses',
    fields: ['status_key', 'label', 'stage', 'tone', 'sort_order', 'is_active'],
    required: ['label'],
    // The key (saved on each lead) is made from the label once and never changes
    beforeCreate: (data) => ({
      ...data,
      status_key: String(data.status_key || data.label).toLowerCase().trim()
        .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40),
    }),
    beforeUpdate: (data, row) => {
      const { status_key: _ignored, ...rest } = data;
      if (Number(row.is_system)) {
        if (rest.is_active === 0) throw badRequest(`"${row.label}" is needed by the system and cannot be hidden`);
        delete rest.stage; // New / Booked / Lost keep their meaning
      }
      return rest;
    },
  },
};

const STAGES = ['open', 'won', 'lost'];
const TONES = ['blue', 'amber', 'green', 'red', 'grey'];

function getMaster(type) {
  const master = MASTERS[type];
  if (!master) throw notFound('Unknown master data type');
  return master;
}

function cleanMaster(master, body) {
  const data = pick(body, master.fields);
  if (data.is_active !== undefined) data.is_active = data.is_active ? 1 : 0;
  if (data.stage !== undefined && !STAGES.includes(data.stage)) throw badRequest('Unknown stage');
  if (data.tone !== undefined && !TONES.includes(data.tone)) throw badRequest('Unknown colour');
  return data;
}

const duplicateError = (error) =>
  error?.code === 'ER_DUP_ENTRY' ? badRequest('A record with the same name/number already exists') : error;

const getMasterList = (type) => dbops.getMasterList(getMaster(type).table);

async function createMaster(admin, type, body) {
  const master = getMaster(type);
  requireFields(body, master.required);

  try {
    let data = cleanMaster(master, body);
    if (master.beforeCreate) data = master.beforeCreate(data);
    const id = await dbops.createMaster(master.table, data);
    if (master.afterSave) await master.afterSave(id, body);
    await logActivity(admin, 'create', master.table, id);
    return { id };
  } catch (error) {
    throw duplicateError(error);
  }
}

async function updateMaster(admin, type, id, body) {
  const master = getMaster(type);
  let data = cleanMaster(master, body);
  if (master.beforeUpdate) {
    const row = await dbops.getMasterRow(master.table, id);
    if (!row) throw notFound();
    data = master.beforeUpdate(data, row);
  }
  if (!Object.keys(data).length && !master.afterSave) throw badRequest('Nothing to update');

  try {
    if (Object.keys(data).length && !(await dbops.updateMaster(master.table, id, data))) throw notFound();
    if (master.afterSave) await master.afterSave(id, body);
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
