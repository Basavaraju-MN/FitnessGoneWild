// Trip photos are kept in the database (table trip_photos), so they survive
// deploys and restarts: Render's disk is wiped on every deploy, so photos
// saved there by the admin were lost.
//
// The website still asks for /images/treks/<slug>/<n>.<ext> (any extension):
//  - photo in the database      -> sent from here
//  - row with no data (deleted) -> 404, so a photo file in git does not come back
//  - no row                     -> next(): the photo file in the build, if any
//
// Each photo is read from the database once, then kept on this server's disk
// (temporary, refilled after a restart). Which photos exist is one small
// query, kept for 2 minutes and dropped at once when the admin changes a photo.
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pool, executeQuery } = require('../db/connection');

const MAX_IMAGES = 5;
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
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
  index: `
    SELECT p.trip_id, t.slug, p.position, p.mime, p.data IS NULL AS removed,
           UNIX_TIMESTAMP(p.updated_at) AS version
    FROM trip_photos p JOIN trips t ON t.id = p.trip_id`,
  getData: 'SELECT data FROM trip_photos WHERE trip_id = ? AND position = ?',
  save: `
    INSERT INTO trip_photos (trip_id, position, mime, data) VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE mime = VALUES(mime), data = VALUES(data), updated_at = CURRENT_TIMESTAMP`,
  // Keeps the row, without the photo: marks it deleted
  remove: `
    INSERT INTO trip_photos (trip_id, position, mime, data) VALUES (?, ?, NULL, NULL)
    ON DUPLICATE KEY UPDATE mime = NULL, data = NULL, updated_at = CURRENT_TIMESTAMP`,
  trips: 'SELECT id, slug FROM trips',
};

/* ---------------- Which photos exist ---------------- */

// slug (lower case) -> Map(number -> { tripId, mime, removed, version })
let index = null;
let indexAt = 0;
let indexRun = null;

async function loadIndex() {
  if (index && Date.now() - indexAt < INDEX_FOR) return index;
  if (!indexRun) {
    indexRun = executeQuery(SQL.index)
      .then((rows) => {
        const next = new Map();
        for (const row of rows) {
          const key = String(row.slug).toLowerCase();
          if (!next.has(key)) next.set(key, new Map());
          next.get(key).set(Number(row.position), {
            tripId: row.trip_id,
            mime: row.mime,
            removed: Boolean(Number(row.removed)),
            version: Number(row.version),
          });
        }
        index = next;
        indexAt = Date.now();
        return index;
      })
      .catch((error) => {
        if (error?.code === 'ER_NO_SUCH_TABLE') {
          index = new Map();
          indexAt = Date.now();
          return index;
        }
        // Database down: keep using the last list (if any)
        console.error('Trip photos list failed:', error?.code || error?.message || error);
        return index;
      })
      .finally(() => { indexRun = null; });
  }
  return indexRun;
}

// The admin changed a photo, or a trip's slug changed
function forget() {
  indexAt = 0;
}

const photosOf = async (slug) => (await loadIndex())?.get(String(slug).toLowerCase()) || new Map();

/* ---------------- Sending a photo ---------------- */

const reading = new Map(); // cache file -> promise, so one photo is read once at a time

async function cacheFile(photo, number) {
  const file = path.join(CACHE_DIR, `${photo.tripId}-${number}-${photo.version}.${EXT[photo.mime] || 'jpg'}`);
  if (fs.existsSync(file)) return file;

  if (!reading.has(file)) {
    reading.set(file, (async () => {
      const rows = await executeQuery(SQL.getData, [photo.tripId, number]);
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

/** Express handler for GET /images/treks/:slug/:file */
async function tripPhoto(req, res, next) {
  const match = /^([1-9])\.(jpe?g|png|webp)$/i.exec(String(req.params.file || ''));
  if (!match || !/^[a-z0-9_-]+$/i.test(String(req.params.slug || ''))) return next();

  try {
    const number = Number(match[1]);
    const photo = (await photosOf(req.params.slug)).get(number);
    if (!photo) return next(); // not in the database: the file in the build, if any
    if (photo.removed) return res.status(404).end();

    const file = await cacheFile(photo, number);
    if (!file) return next();
    return res.sendFile(file, {
      maxAge: 10 * 60 * 1000,
      headers: { 'Content-Type': photo.mime },
    });
  } catch (error) {
    console.error('Trip photo failed:', error?.code || error?.message || error);
    return next(); // fall back to the file in the build
  }
}

/* ---------------- For the admin ---------------- */

const urlFor = (slug, number, ext, version) =>
  `/images/treks/${encodeURIComponent(slug)}/${number}.${ext}${version ? `?v=${version}` : ''}`;

// Photo file of the website build / source for <slug>/<n>, if any
function fileFor(dirs, slug, number) {
  for (const dir of dirs) {
    for (const ext of Object.keys(MIME)) {
      const file = path.join(dir, 'images', 'treks', slug, `${number}.${ext}`);
      if (fs.existsSync(file)) return { file, ext };
    }
  }
  return null;
}

/**
 * [{ number, file, url }] for 1..5, as the website shows them: the database
 * first, else a photo file in git (dirs = client public / dist folders).
 */
async function listPhotos(trip, dirs = []) {
  const slug = trip.slug;
  if (!/^[a-z0-9_-]+$/i.test(String(slug || ''))) return [];
  const photos = await photosOf(slug);
  const images = [];

  for (let number = 1; number <= MAX_IMAGES; number += 1) {
    const photo = photos.get(number);
    if (photo?.removed) continue;
    if (photo) {
      const ext = EXT[photo.mime] || 'jpg';
      images.push({ number, file: `${number}.${ext}`, url: urlFor(slug, number, ext, photo.version) });
      continue;
    }
    const found = fileFor(dirs, slug, number);
    if (found) {
      const { mtimeMs } = fs.statSync(found.file);
      images.push({ number, file: `${number}.${found.ext}`, url: urlFor(slug, number, found.ext, Math.round(mtimeMs)) });
    }
  }
  return images;
}

async function savePhoto(tripId, number, mime, buffer) {
  try {
    // Prepared statement: the photo is sent as it is (a plain query sends it
    // as hex text, twice the size, which can pass the database's packet limit)
    await pool.promise().execute(SQL.save, [tripId, number, mime, buffer]);
  } catch (error) {
    if (error?.code === 'ER_NO_SUCH_TABLE') {
      await ensureTable();
      await pool.promise().execute(SQL.save, [tripId, number, mime, buffer]);
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

async function deletePhoto(tripId, number) {
  try {
    await executeQuery(SQL.remove, [tripId, number]);
  } finally {
    forget();
  }
}

/* ---------------- Start-up ---------------- */

async function ensureTable() {
  await executeQuery(SQL.createTable);
}

/**
 * Creates the table, then copies photo files from the build (the ones in git)
 * into the database for every photo the database does not have yet. Runs when
 * the server starts; after the first time it only does two small queries.
 */
async function movePhotoFilesToDb(clientDist) {
  await ensureTable();
  forget();
  const photos = (await loadIndex()) || new Map();
  let moved = 0;

  for (const trip of await executeQuery(SQL.trips)) {
    if (!/^[a-z0-9_-]+$/i.test(String(trip.slug || ''))) continue;
    const known = photos.get(String(trip.slug).toLowerCase()) || new Map();
    for (let number = 1; number <= MAX_IMAGES; number += 1) {
      if (known.has(number)) continue; // in the database, or deleted from the admin
      const found = fileFor([clientDist], trip.slug, number);
      if (!found) continue;
      try {
        await savePhoto(trip.id, number, MIME[found.ext], fs.readFileSync(found.file));
        moved += 1;
      } catch (error) {
        console.error(`Trip photo ${trip.slug}/${number}: not moved:`, error?.code || error?.message || error);
      }
    }
  }
  if (moved) console.log(`Trip photos moved into the database: ${moved}`);
}

module.exports = {
  MAX_IMAGES,
  EXT,
  tripPhoto,
  listPhotos,
  savePhoto,
  deletePhoto,
  forget,
  movePhotoFilesToDb,
};
