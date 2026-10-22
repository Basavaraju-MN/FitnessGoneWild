// Packages & Trips screen (the treks shown on the website).
// Called by controller/controller.js; reads and writes through db/dbops.js.
// Photos and brochures are files on disk (see tripFiles.js).
const dbops = require('../../db/dbops');
const tripFiles = require('./tripFiles');
const ftpBrochure = require('../../../server/src/components/broucher/ftpBrochure');

// Brochures are kept only on Hostinger (public_html/public/brochures/<slug>/), read over FTP
async function brochureFor(slug) {
  const found = await ftpBrochure.findBrochure(slug);
  return found ? found.file : null;
}

// Where the trek's brochure must be on Hostinger, and whether it is there (looked up fresh)
async function getBrochureCheck(id) {
  const trip = await findTrip(id);
  const configured = ftpBrochure.isConfigured();
  const found = configured ? await ftpBrochure.findBrochure(trip.slug, { fresh: true }) : null;
  return {
    configured,
    via: 'ftp',
    folder: ftpBrochure.folder(),
    fileName: found?.file || `${trip.slug}/<any name>.pdf`,
    url: null,
    found: Boolean(found),
    size: found?.size || null,
    localFile: null,
  };
}
const {
  badRequest,
  notFound,
  pick,
  requireFields,
  logActivity,
} = require('../../utils/http');
const { cleanRichText, plainText } = require('./richText');

const BLURB_MAX = 300; // characters of text in the short description

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

  // Rich text from the editor: cleaned HTML (formatting kept)
  for (const key of ['blurb', 'description', 'itinerary']) {
    if (data[key] !== undefined) data[key] = cleanRichText(data[key]);
  }
  if (data.blurb !== undefined) {
    if (!data.blurb) throw badRequest('Enter a short description');
    if (plainText(data.blurb).length > BLURB_MAX) {
      throw badRequest(`Short description: keep it under ${BLURB_MAX} characters`);
    }
  }
  return data;
}

// Inclusions / exclusions text: one item per line, blank lines removed.
// undefined = not sent, so leave them as they are
function cleanList(value) {
  if (value === undefined) return undefined;
  return String(value || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join('\n');
}

async function saveInclusions(tripId, body) {
  const inclusions = cleanList(body.inclusions);
  const exclusions = cleanList(body.exclusions);
  if (inclusions === undefined && exclusions === undefined) return;

  // Keep whichever list was not sent
  const current = await dbops.getTripInclusions(tripId);
  await dbops.saveTripInclusions(
    tripId,
    inclusions ?? current.inclusions,
    exclusions ?? current.exclusions
  );
}

const MIN_PICKUP_POINTS = 2;

// Checks the pickup list from the trip form ([{ id?, name, address }] in order)
// before anything is saved. Returns the cleaned list, or undefined if not sent.
function checkPickupPoints(list) {
  if (list === undefined) return undefined;
  if (!Array.isArray(list)) throw badRequest('Pickup points must be a list');

  const points = list
    .map((p) => ({
      id: Number(p?.id) || null,
      name: String(p?.name || '').trim(),
      address: String(p?.address || '').trim() || null,
    }))
    .filter((p) => p.name);

  if (points.length < MIN_PICKUP_POINTS) {
    throw badRequest(`Add at least ${MIN_PICKUP_POINTS} pickup points`);
  }

  const names = points.map((p) => p.name.toLowerCase());
  if (new Set(names).size !== names.length) throw badRequest('Two pickup points have the same name');

  return points;
}

// Saves a checked pickup list: existing ones updated, new ones added, and
// removed ones hidden (not deleted: past bookings still point to them).
async function savePickupPoints(tripId, points) {
  if (points === undefined) return;

  const existing = await dbops.getTripPickupPoints(tripId);
  const kept = new Set();

  for (const [index, point] of points.entries()) {
    // Match by id, or reuse a hidden point with the same name
    const match =
      existing.find((e) => point.id && e.id === point.id) ||
      existing.find((e) => !kept.has(e.id) && e.name.toLowerCase() === point.name.toLowerCase());

    const data = { name: point.name, address: point.address, sort_order: index + 1, is_active: 1 };

    try {
      if (match) {
        kept.add(match.id);
        await dbops.updatePickupPoint(tripId, match.id, data);
      } else {
        kept.add(await dbops.createPickupPoint({ trip_id: tripId, ...data }));
      }
    } catch (error) {
      if (error?.code === 'ER_DUP_ENTRY') throw badRequest(`Pickup point "${point.name}" is listed twice`);
      throw error;
    }
  }

  for (const old of existing) {
    if (!kept.has(old.id) && Number(old.is_active)) {
      await dbops.updatePickupPoint(tripId, old.id, { is_active: 0 });
    }
  }
}

async function findTrip(id) {
  const trip = await dbops.getTripById(id);
  if (!trip) throw notFound('Trip not found');
  return trip;
}

// Trip cards: each with its cover photo and brochure status.
// Brochures: one Hostinger folder listing for all treks (not one per trek).
async function getTrips() {
  const [trips, brochureOf] = await Promise.all([dbops.getTrips(), ftpBrochure.brochureIndex()]);

  return Promise.all(
    trips.map(async (trip) => {
      const images = await tripFiles.listImages(trip.slug);
      return {
        ...trip,
        cover_url: images[0]?.url || null,
        image_count: images.length,
        brochure_file: brochureOf ? brochureOf(trip.slug) : null,
      };
    })
  );
}

// One trip for the edit panel, with all its photos and brochure
async function getTrip(id) {
  const trip = await findTrip(id);
  const [images, brochure, lists, pickups] = await Promise.all([
    tripFiles.listImages(trip.slug),
    brochureFor(trip.slug),
    dbops.getTripInclusions(trip.id),
    dbops.getTripPickupPoints(trip.id),
  ]);
  return {
    ...trip,
    ...lists,
    pickup_points: pickups.filter((p) => Number(p.is_active)),
    images,
    brochure_file: brochure,
  };
}

async function createTrip(admin, body) {
  requireFields(body, ['slug', 'name', 'category_id', 'blurb', 'duration_label', 'price']);
  const data = cleanTrip(body);
  const pickups = checkPickupPoints(body.pickup_points);

  if (await dbops.isSlugTaken(data.slug)) throw badRequest('Another trip already uses this slug');

  const id = await dbops.createTrip(data);
  await saveInclusions(id, body);
  await savePickupPoints(id, pickups);
  await logActivity(admin, 'create', 'trip', id, data.name);
  return { id };
}

async function updateTrip(admin, id, body) {
  const trip = await findTrip(id);
  const data = cleanTrip(body);
  const pickups = checkPickupPoints(body.pickup_points);
  const hasLists =
    body.inclusions !== undefined || body.exclusions !== undefined || body.pickup_points !== undefined;
  if (!Object.keys(data).length && !hasLists) throw badRequest('Nothing to update');

  if (data.slug && (await dbops.isSlugTaken(data.slug, id))) {
    throw badRequest('Another trip already uses this slug');
  }

  if (Object.keys(data).length) await dbops.updateTrip(id, data);
  await saveInclusions(id, body);
  await savePickupPoints(id, pickups);

  // New slug: its photo and brochure folders move with it
  if (data.slug && data.slug !== trip.slug) {
    await tripFiles.renameFolders(trip.slug, data.slug);
  }

  await logActivity(admin, 'update', 'trip', id, [...Object.keys(data), ...(hasLists ? ['inclusions'] : [])].join(', '));
  return { id };
}

/* ---------------- Photos (1 = cover) ---------------- */

async function uploadTripImage(admin, id, { number, dataUrl }) {
  const trip = await findTrip(id);
  await tripFiles.saveImage(trip.slug, number, dataUrl);
  await logActivity(admin, 'upload_photo', 'trip', trip.id, `photo ${number}`);
  return { images: await tripFiles.listImages(trip.slug) };
}

async function deleteTripImage(admin, id, number) {
  const trip = await findTrip(id);
  await tripFiles.deleteImage(trip.slug, number);
  await logActivity(admin, 'delete_photo', 'trip', trip.id, `photo ${number}`);
  return { images: await tripFiles.listImages(trip.slug) };
}

/* ---------------- Brochure ---------------- */

async function uploadTripBrochure(admin, id, { fileName, dataUrl }) {
  const trip = await findTrip(id);
  const name = await tripFiles.saveBrochure(trip.slug, fileName, dataUrl);
  await logActivity(admin, 'upload_brochure', 'trip', trip.id, name);
  return { brochure_file: name };
}

async function deleteTripBrochure(admin, id) {
  const trip = await findTrip(id);
  await tripFiles.deleteBrochure(trip.slug);
  await logActivity(admin, 'delete_brochure', 'trip', trip.id);
  return { brochure_file: null };
}

module.exports = {
  getBrochureCheck,
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  uploadTripImage,
  deleteTripImage,
  uploadTripBrochure,
  deleteTripBrochure,
};
