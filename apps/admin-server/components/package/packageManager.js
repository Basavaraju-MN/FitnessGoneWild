// Packages & Trips screen (the treks shown on the website).
// Called by controller/controller.js; reads and writes through db/dbops.js.
// Photos are files on disk (see tripFiles.js). Brochures are on Hostinger
// and have their own screen (Brochures), so this screen never waits for FTP.
const dbops = require('../../db/dbops');
const tripFiles = require('./tripFiles');
const ftpBrochure = require('../../../server/src/components/broucher/ftpBrochure');
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
  'slug', 'name', 'category_id', 'region_id', 'blurb', 'description', 'itinerary',
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
  if (data.region_id !== undefined) data.region_id = Number(data.region_id) || null;

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

/* ---------- Terms & policies ---------- */

const MAX_TERM_SECTIONS = 30;

// body.terms_sections: [{ title, body }] in order; body.terms_highlights:
// key points, one per line. undefined = not sent, leave as they are.
function checkTerms(body) {
  let sections;
  if (body.terms_sections !== undefined) {
    if (!Array.isArray(body.terms_sections)) throw badRequest('Terms must be a list of sections');
    sections = body.terms_sections
      .map((s) => ({ title: String(s?.title || '').trim().slice(0, 150), body: cleanRichText(s?.body || '') }))
      .filter((s) => s.title || plainText(s.body));
    if (sections.length > MAX_TERM_SECTIONS) throw badRequest(`Terms: up to ${MAX_TERM_SECTIONS} sections`);
    const untitled = sections.findIndex((s) => !s.title);
    if (untitled >= 0) throw badRequest(`Terms: section ${untitled + 1} needs a heading`);
    const empty = sections.findIndex((s) => !plainText(s.body));
    if (empty >= 0) throw badRequest(`Terms: write the text of "${sections[empty].title}"`);
  }
  let highlights;
  if (body.terms_highlights !== undefined) {
    highlights = String(body.terms_highlights || '')
      .split(/\r?\n/).map((line) => line.trim().slice(0, 80)).filter(Boolean).slice(0, 6).join('\n');
    if (highlights.length > 600) throw badRequest('Key points: keep them shorter');
  }
  return { sections, highlights };
}

// Treks that already have terms, to copy from
const getTermsSources = () => dbops.getTripsWithTerms();

async function getTripTerms(id) {
  await findTrip(id);
  return dbops.getTripTerms(id);
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
      city_id: Number(p?.city_id) || null,
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
    if (point.city_id) data.city_id = point.city_id;

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

// Trip cards: each with its cover photo
async function getTrips() {
  const trips = await dbops.getTrips();

  return Promise.all(
    trips.map(async (trip) => {
      const images = await tripFiles.listImages(trip.slug);
      return {
        ...trip,
        cover_url: images[0]?.url || null,
        image_count: images.length,
      };
    })
  );
}

// One trip for the edit panel, with all its photos
async function getTrip(id) {
  const trip = await findTrip(id);
  const [images, lists, pickups, terms] = await Promise.all([
    tripFiles.listImages(trip.slug),
    dbops.getTripInclusions(trip.id),
    dbops.getTripPickupPoints(trip.id),
    dbops.getTripTerms(trip.id),
  ]);
  return {
    ...trip,
    ...lists,
    ...terms,
    pickup_points: pickups.filter((p) => Number(p.is_active)),
    images,
  };
}

async function createTrip(admin, body) {
  requireFields(body, ['slug', 'name', 'category_id', 'region_id', 'blurb', 'duration_label', 'price']);
  const data = cleanTrip(body);
  const pickups = checkPickupPoints(body.pickup_points);
  const terms = checkTerms(body);

  if (await dbops.isSlugTaken(data.slug)) throw badRequest('Another trip already uses this slug');

  const id = await dbops.createTrip(data);
  await saveInclusions(id, body);
  await savePickupPoints(id, pickups);
  await dbops.saveTripTerms(id, terms.sections, terms.highlights);
  await logActivity(admin, 'create', 'trip', id, data.name);
  return { id };
}

async function updateTrip(admin, id, body) {
  const trip = await findTrip(id);
  const data = cleanTrip(body);
  const pickups = checkPickupPoints(body.pickup_points);
  const terms = checkTerms(body);
  const hasTerms = terms.sections !== undefined || terms.highlights !== undefined;
  const hasLists =
    body.inclusions !== undefined || body.exclusions !== undefined || body.pickup_points !== undefined || hasTerms;
  if (!Object.keys(data).length && !hasLists) throw badRequest('Nothing to update');

  if (data.slug && (await dbops.isSlugTaken(data.slug, id))) {
    throw badRequest('Another trip already uses this slug');
  }

  if (Object.keys(data).length) await dbops.updateTrip(id, data);
  await saveInclusions(id, body);
  await savePickupPoints(id, pickups);
  if (hasTerms) await dbops.saveTripTerms(id, terms.sections, terms.highlights);

  // New slug: its photo and brochure folders move with it
  if (data.slug && data.slug !== trip.slug) {
    await tripFiles.renameFolders(trip.slug, data.slug);
  }

  await logActivity(admin, 'update', 'trip', id, [...Object.keys(data), ...(hasLists ? ['inclusions'] : []), ...(hasTerms ? ['terms'] : [])].join(', '));
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

/* ---------------- Brochures screen (Hostinger, over FTP) ---------------- */

const MAX_BROCHURE_BYTES = 20 * 1024 * 1024;

function requireFtp() {
  if (!ftpBrochure.isConfigured()) {
    throw badRequest('Hostinger FTP is not set up on the server (HOSTINGER_FTP_HOST, HOSTINGER_FTP_USER, HOSTINGER_FTP_PASSWORD)');
  }
}

// What Hostinger has for each trek (slug -> { file, size } | null). Read
// over FTP once, then kept: uploads and deletes from the admin update it,
// so the Brochures screen opens without FTP. "Refresh" (fresh) reads it again,
// e.g. after files were changed in Hostinger File Manager.
let brochureCache = null;
let brochureRun = null; // the FTP read in progress, shared by every caller

async function readBrochures(slugs) {
  if (!brochureRun) {
    brochureRun = ftpBrochure.brochuresFor(slugs)
      .then((found) => { brochureCache = found; return found; })
      .finally(() => { brochureRun = null; });
  }
  return brochureRun;
}

const setCachedBrochure = (slug, brochure) => {
  if (brochureCache) brochureCache[slug] = brochure || null;
};

// Every trek with its brochure on Hostinger
async function getBrochures({ fresh = false } = {}) {
  const trips = await dbops.getTrips();
  const configured = ftpBrochure.isConfigured();
  let found = {};
  if (configured) {
    found = !fresh && brochureCache ? brochureCache : await readBrochures(trips.map((t) => t.slug));
    // A trek added since the read: just created, so no brochure yet
    for (const t of trips) if (!(t.slug in found)) found[t.slug] = null;
  }
  return {
    configured,
    folder: ftpBrochure.folder(),
    trips: trips.map((t) => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      brochure: found[t.slug] || null, // { file, size }
    })),
  };
}

async function uploadTripBrochure(admin, id, { fileName, dataUrl }) {
  requireFtp();
  const trip = await findTrip(id);
  const match = /^data:application\/pdf;base64,(.+)$/s.exec(String(dataUrl || ''));
  const buffer = match ? Buffer.from(match[1], 'base64') : null;
  if (!buffer || buffer.subarray(0, 4).toString() !== '%PDF') throw badRequest('The brochure must be a PDF file');
  if (buffer.length > MAX_BROCHURE_BYTES) throw badRequest('Brochure is too large (max 20 MB)');

  // What the website now serves; another file name means an older
  // "<slug>…pdf" beside the folder still comes first on Hostinger
  const brochure = await ftpBrochure.uploadBrochure(trip.slug, fileName, buffer);
  setCachedBrochure(trip.slug, brochure);
  await logActivity(admin, 'upload_brochure', 'trip', trip.id, brochure?.file || fileName);
  return { brochure };
}

async function deleteTripBrochure(admin, id) {
  requireFtp();
  const trip = await findTrip(id);
  const next = await ftpBrochure.removeBrochure(trip.slug);
  setCachedBrochure(trip.slug, next);
  await logActivity(admin, 'delete_brochure', 'trip', trip.id);
  return { brochure: next }; // another PDF for this trek, if Hostinger has one
}

module.exports = {
  getTermsSources,
  getTripTerms,
  getBrochures,
  getTrips,
  getTrip,
  createTrip,
  updateTrip,
  uploadTripImage,
  deleteTripImage,
  uploadTripBrochure,
  deleteTripBrochure,
};
