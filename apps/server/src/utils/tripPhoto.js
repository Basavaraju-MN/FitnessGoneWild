// Trip photos are kept only in the database (table trip_photos): one row per
// trip id + position (1..5, 1 = cover). Render wipes its disk on every
// deploy, so photos are never kept as files of the website.
//
//   /trip-photo/<trip id>/<position>?v=<version>   one photo
//
// The address changes when a photo is replaced, so browsers keep each one
// for a year. The trip APIs list each trip's photos (photos: [url, ...]).
// Each photo is read from the database once, then kept on this server's disk
// (temporary, refilled after a restart). Which photos exist is one small
// query, kept for 2 minutes and dropped at once when the admin changes a photo.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pool, executeQuery } = require('../db/connection');

const MAX_IMAGES = 5;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const CACHE_DIR = path.join(os.tmpdir(), 'fgw-trip-photos');
const INDEX_FOR = 2 * 60 * 1000;

const SQL = {
  createTable: `
    CREATE TABLE IF NOT EXISTS trip_photos (
      trip_id INT NOT NULL,
      position TINYINT NOT NULL,
      mime VARCHAR(40) NULL,
      data MEDIUMBLOB NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (trip_id, position)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4`,
  // Rows without data were deletes kept by the earlier version: dropped on start-up
  dropEmpty: 'DELETE FROM trip_photos WHERE data IS NULL',
  index: `
    SELECT p.trip_id, t.slug, p.position, p.mime, UNIX_TIMESTAMP(p.updated_at) AS version
    FROM trip_photos p JOIN trips t ON t.id = p.trip_id
    WHERE p.data IS NOT NULL AND p.position BETWEEN 1 AND ${MAX_IMAGES}
    ORDER BY p.trip_id, p.position`,
  getData: 'SELECT data FROM trip_photos WHERE trip_id = ? AND position = ?',
  save: `
    INSERT INTO trip_photos (trip_id, position, mime, data) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
  remove: 'DELETE FROM trip_photos WHERE trip_id = ? AND position = ?',
};

/* ---------------- Which photos exist ---------------- */

// { byTrip: Map(tripId -> [{ position, mime, version }]), bySlug: Map(slug -> tripId) }
let index = null;
let indexAt = 0;
let indexRun = null;
const EMPTY = { byTrip: new Map(), bySlug: new Map() };

async function loadIndex() {
  if (index && Date.now() - indexAt < INDEX_FOR) return index;
  if (!indexRun) {
    indexRun = executeQuery(SQL.index)
      .then((rows) => {
        const next = { byTrip: new Map(), bySlug: new Map() };
        for (const row of rows) {
          const tripId = Number(row.trip_id);
          if (!next.byTrip.has(tripId)) next.byTrip.set(tripId, []);
          next.byTrip.get(tripId).push({ position: Number(row.position), mime: row.mime, version: Number(row.version) });
          next.bySlug.set(String(row.slug).toLowerCase(), tripId);
        }
        index = next;
        indexAt = Date.now();
        return index;
      })
      .catch((error) => {
        if (error?.code !== 'ER_NO_SUCH_TABLE') {
          // Database down: keep using the last list (if any)
          console.error('Trip photos list failed:', error?.code || error?.message || error);
        }
        return index || EMPTY;
      })
      .finally(() => { indexRun = null; });
  }
  return indexRun;
}

// The admin changed a photo, or a trip's slug changed
function forget() {
  indexAt = 0;
}

const urlFor = (tripId, photo) => `/trip-photo/${tripId}/${photo.position}?v=${photo.version}`;

/** The trip's photos in order: [{ position, file, url }] */
async function listPhotos(tripId) {
  const photos = (await loadIndex()).byTrip.get(Number(tripId)) || [];
  return photos.map((photo) => ({
    position: photo.position,
    file: `${photo.position}.${EXT[photo.mime] || 'jpg'}`,
    url: urlFor(tripId, photo),
  }));
}

/** Adds photos: [url, ...] (cover first) to each trip of a list */
async function withPhotos(trips) {
  const { byTrip } = await loadIndex();
  return trips.map((trip) => ({
    ...trip,
    photos: (byTrip.get(Number(trip.id)) || []).map((photo) => urlFor(trip.id, photo)),
  }));
}

/* ---------------- Sending a photo ---------------- */

const reading = new Map(); // cache file -> promise, so one photo is read once at a time

async function cacheFile(tripId, photo) {
  const file = path.join(CACHE_DIR, `${tripId}-${photo.position}-${photo.version}.${EXT[photo.mime] || 'jpg'}`);
  if (fs.existsSync(file)) return file;

  if (!reading.has(file)) {
    reading.set(file, (async () => {
      const rows = await executeQuery(SQL.getData, [tripId, photo.position]);
      const data = rows[0]?.data;
      if (!data) return null;
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      const part = `${file}.${process.pid}.part`;
      fs.writeFileSync(part, data);
      fs.renameSync(part, file);
      return file;
    })().finally(() => reading.delete(file)));
  }
  return reading.get(file);
}

/** Express handler for GET /trip-photo/:tripId/:position */
async function tripPhoto(req, res, next) {
  const tripId = Number(req.params.tripId);
  const position = Number(req.params.position);
  if (!Number.isInteger(tripId) || tripId < 1 || !Number.isInteger(position) || position < 1 || position > MAX_IMAGES) {
    return res.status(404).end();
  }

  try {
    const photo = ((await loadIndex()).byTrip.get(tripId) || []).find((p) => p.position === position);
    const file = photo && await cacheFile(tripId, photo);
    if (!file) return res.status(404).end();

    // Addresses with the photo's version never change: kept for a year
    const current = Number(req.query.v) === photo.version;
    return res.sendFile(file, {
      maxAge: current ? 365 * 24 * 60 * 60 * 1000 : 5 * 60 * 1000,
      immutable: current,
      headers: { 'Content-Type': photo.mime },
    });
  } catch (error) {
    return next(error);
  }
}

/**
 * Old addresses /images/treks/<slug>/<n>.<ext> (shared links, search engines):
 * sent on to the photo's new address.
 */
async function oldTripPhoto(req, res, next) {
  const match = /^([1-9])\.(jpe?g|png|webp)$/i.exec(String(req.params.file || ''));
  if (!match) return next();
  try {
    const { byTrip, bySlug } = await loadIndex();
    const tripId = bySlug.get(String(req.params.slug || '').toLowerCase());
    const photo = tripId && (byTrip.get(tripId) || []).find((p) => p.position === Number(match[1]));
    if (!photo) return res.status(404).end();
    return res.redirect(301, urlFor(tripId, photo));
  } catch (error) {
    return next(error);
  }
}

/* ---------------- For the admin ---------------- */

async function savePhoto(tripId, position, mime, buffer) {
  // Prepared statement: the photo is sent as it is (a plain query sends it
  // as hex text, twice the size, which can pass the database's packet limit)
  const save = () => pool.promise().execute(SQL.save, [tripId, position, mime, buffer]);
  try {
    await save();
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      await ensureTable();
      await save();
    } else if (error?.code === 'ER_NET_PACKET_TOO_LARGE') {
      const tooBig = new Error('The database does not accept a photo this large. Please use a smaller photo (under 4 MB).');
      tooBig.status = 400;
      throw tooBig;
    } else {
      throw error;
    }
  } finally {
    forget();
  }
}

async function deletePhoto(tripId, position) {
  try {
    await executeQuery(SQL.remove, [tripId, position]);
  } finally {
    forget();
  }
}

/* ---------------- Start-up ---------------- */

async function ensureTable() {
  await executeQuery(SQL.createTable);
}

/** Creates the table if needed and drops deletes kept by the earlier version */
async function prepareTripPhotos() {
  await ensureTable();
  await executeQuery(SQL.dropEmpty);
  forget();
}

module.exports = {
  MAX_IMAGES,
  tripPhoto,
  oldTripPhoto,
  listPhotos,
  withPhotos,
  savePhoto,
  deletePhoto,
  forget,
  prepareTripPhotos,
};
