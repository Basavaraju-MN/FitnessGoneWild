// Smaller copies of website photos, so phones do not download full-size ones.
//
//   /trip-photo/5/1?v=…&w=800     the same photo, 800 px wide, compressed WebP
//
// Works for trip, hero and About-page photos. Only the sizes in WIDTHS are
// made (a photo is never made bigger than it is). Each copy is made once,
// then kept on this server's disk (temporary, made again after a restart).
// If a copy cannot be made, the original photo is sent instead.
const fs = require('fs');
const os = require('os');
const path = require('path');

const WIDTHS = [480, 800, 1200, 1600];
const QUALITY = 72; // WebP quality: small files, no visible loss on a phone
const CACHE_DIR = path.join(os.tmpdir(), 'fgw-photo-sizes');

let sharp = null;
try {
  // eslint-disable-next-line global-require
  sharp = require('sharp');
  sharp.cache(false); // copies are kept on disk; keep the server's memory low
  sharp.concurrency(1); // small server: one photo at a time
} catch (error) {
  console.error('Photo sizes are off (sharp could not load):', error?.message || error);
}

/** The size asked for (?w=800), or null for the original photo */
function wantedWidth(req) {
  const width = Number(req.query?.w);
  return sharp && WIDTHS.includes(width) ? width : null;
}

const making = new Map(); // copy file -> promise, so one copy is made once at a time

/**
 * The smaller copy's file. key: unique name of the photo and its version
 * (e.g. "trip-5-1-1794379206"); source: the original as a file path or Buffer.
 */
async function sizedFile(key, source, width) {
  const safe = String(key).replace(/[^A-Za-z0-9_-]+/g, '-');
  const file = path.join(CACHE_DIR, `${safe}-w${width}.webp`);
  if (fs.existsSync(file)) return file;

  if (!making.has(file)) {
    making.set(file, (async () => {
      fs.mkdirSync(CACHE_DIR, { recursive: true });
      const part = `${file}.${process.pid}.part`;
      await sharp(source, { failOn: 'none' })
        .rotate() // phone photos: turned the right way up
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: QUALITY, effort: 4 })
        .toFile(part);
      fs.renameSync(part, file);
      return file;
    })().finally(() => making.delete(file)));
  }
  return making.get(file);
}

/**
 * Sends the photo: the smaller copy when ?w= asks for one, else the original.
 * photo: { key, source (file path or Buffer), mime, maxAge (ms), immutable }
 */
async function sendPhoto(req, res, { key, source, mime, maxAge, immutable }) {
  const width = key ? wantedWidth(req) : null; // no key: original only
  if (width) {
    try {
      const file = await sizedFile(key, source, width);
      return res.sendFile(file, { maxAge, immutable, headers: { 'Content-Type': 'image/webp' } });
    } catch (error) {
      console.error(`Photo ${key} at ${width}px could not be made, sending the original:`, error?.message || error);
    }
  }
  if (Buffer.isBuffer(source)) {
    res.set('Content-Type', mime);
    res.set('Cache-Control', immutable ? `public, max-age=${Math.round(maxAge / 1000)}, immutable` : `public, max-age=${Math.round(maxAge / 1000)}`);
    return res.send(source);
  }
  return res.sendFile(source, { maxAge, immutable, headers: { 'Content-Type': mime } });
}

module.exports = { WIDTHS, wantedWidth, sendPhoto };
