// Packages & Trips screen (the treks shown on the website).
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const {
  badRequest,
  notFound,
  pick,
  requireFields,
  logActivity,
} = require('../../utils/http');

const TRIP_FIELDS = [
  'slug', 'name', 'category_id', 'blurb', 'description', 'itinerary',
  'duration_label', 'duration_days', 'difficulty', 'distance_label',
  'price', 'without_transport_price', 'with_transport_price', 'price_note',
  'badge_text', 'badge_style', 'is_featured', 'featured_label',
  'featured_order', 'status',
];

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

const getTrips = () => dbops.getTrips();

async function getTrip(id) {
  const trip = await dbops.getTripById(id);
  if (!trip) throw notFound('Trip not found');
  return trip;
}

async function createTrip(admin, body) {
  requireFields(body, ['slug', 'name', 'category_id', 'blurb', 'duration_label', 'price']);
  const data = cleanTrip(body);

  if (await dbops.isSlugTaken(data.slug)) throw badRequest('Another trip already uses this slug');

  const id = await dbops.createTrip(data);
  await logActivity(admin, 'create', 'trip', id, data.name);
  return { id };
}

async function updateTrip(admin, id, body) {
  const data = cleanTrip(body);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  if (data.slug && (await dbops.isSlugTaken(data.slug, id))) {
    throw badRequest('Another trip already uses this slug');
  }

  if (!(await dbops.updateTrip(id, data))) throw notFound('Trip not found');

  await logActivity(admin, 'update', 'trip', id, Object.keys(data).join(', '));
  return { id };
}

module.exports = {
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
};
