// Hero photos are kept in the database (table hero_photos, edited in the
// admin's Website Hero screen). /hero-photo/<id>?v=<version> sends one.
// Each photo is read from the database once, then served from memory; the
// address changes when a photo is replaced, so browsers keep it for a year.
const dbops = require('../db/dbops');

const kept = new Map(); // "<id>:<version>" -> { mime, data }
const MAX_KEPT = 30; // a few heroes, each about 0.2–0.5 MB

async function heroPhoto(req, res, next) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return next();

  const key = `${id}:${req.query.v || ''}`;
  try {
    let photo = kept.get(key);
    if (!photo) {
      photo = await dbops.getHeroPhoto(id);
      if (!photo) return res.status(404).end();
      if (kept.size >= MAX_KEPT) kept.delete(kept.keys().next().value);
      kept.set(key, photo);
    }

    res.set('Content-Type', photo.mime);
    res.set('Cache-Control', req.query.v ? 'public, max-age=31536000, immutable' : 'public, max-age=300');
    return res.send(photo.data);
  } catch (error) {
    return next(error);
  }
}

const MIME = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

/**
 * Heroes that still use a photo file of the website (/images/…) get that
 * photo copied into the database and their /hero-photo address. Runs when
 * the server starts; once every hero is moved it only does one small query.
 */
async function moveHeroPhotosToDb(clientDist) {
  const fs = require('fs');
  const path = require('path');
  let moved = 0;

  for (const hero of await dbops.getHeroesWithFilePhotos()) {
    const file = path.join(clientDist, hero.image_path.split('?')[0]);
    const mime = MIME[path.extname(file).toLowerCase()];
    if (!mime || !file.startsWith(clientDist) || !fs.existsSync(file)) {
      console.warn(`Hero ${hero.id}: photo file ${hero.image_path} not found, left as it is`);
      continue;
    }
    await dbops.saveHeroPhoto(hero.id, mime, fs.readFileSync(file));
    await dbops.setHeroImagePath(hero.id, `/hero-photo/${hero.id}?v=${Date.now()}`);
    moved += 1;
  }
  if (moved) console.log(`Hero photos moved into the database: ${moved}`);
}

// The admin changed or deleted this hero's photo: drop the copies in memory
function forgetHeroPhoto(heroId) {
  for (const key of kept.keys()) {
    if (key.startsWith(`${heroId}:`)) kept.delete(key);
  }
}

module.exports = { heroPhoto, moveHeroPhotosToDb, forgetHeroPhoto };
