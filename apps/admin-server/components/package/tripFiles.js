// Trip photos on disk — the same folders the website reads:
//   apps/client/public/images/treks/<slug>/1.jpg … 5.jpg
//   (also copied into apps/client/dist so the running site shows them at once)
// Brochures are on Hostinger (see the Brochures screen and ftpBrochure.js).
const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');

const { paths } = require('../../config');
const { badRequest } = require('../../utils/http');

const MAX_IMAGES = 5;
const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp'];
const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// Slugs are folder names; anything else could point outside the folder
function checkSlug(slug) {
  if (!/^[a-z0-9_-]+$/i.test(String(slug || ''))) {
    throw badRequest('This trip has no valid slug, so its files cannot be saved');
  }
  return slug;
}

const exists = (p) => fs.existsSync(p);

// Source folder first; the built site's folder only when the site has been built
const imageDirs = (slug) => [
  path.join(paths.clientPublic, 'images', 'treks', checkSlug(slug)),
  ...(exists(paths.clientDist) ? [path.join(paths.clientDist, 'images', 'treks', slug)] : []),
];

// "data:image/png;base64,AAAA" -> { mime, buffer }
function decodeDataUrl(dataUrl) {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw badRequest('The file could not be read. Please choose it again.');
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

/* ---------------- Photos ---------------- */

// [{ number, file, url }] for 1..5, in order (url changes when the photo does)
async function listImages(slug) {
  if (!/^[a-z0-9_-]+$/i.test(String(slug || ''))) return [];

  const dir = path.join(paths.clientPublic, 'images', 'treks', slug);
  if (!exists(dir)) return [];

  const files = await fsp.readdir(dir);
  const images = [];

  for (let number = 1; number <= MAX_IMAGES; number += 1) {
    const file = IMAGE_EXTENSIONS.map((ext) => `${number}.${ext}`).find((name) => files.includes(name));
    if (!file) continue;

    const { mtimeMs } = await fsp.stat(path.join(dir, file));
    images.push({
      number,
      file,
      url: `/images/treks/${encodeURIComponent(slug)}/${file}?v=${Math.round(mtimeMs)}`,
    });
  }

  return images;
}

async function removeImageFiles(dir, number) {
  for (const ext of IMAGE_EXTENSIONS) {
    await fsp.rm(path.join(dir, `${number}.${ext}`), { force: true });
  }
}

async function saveImage(slug, number, dataUrl) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > MAX_IMAGES) throw badRequest(`Photo number must be 1 to ${MAX_IMAGES}`);

  const { mime, buffer } = decodeDataUrl(dataUrl);
  const ext = IMAGE_TYPES[mime];
  if (!ext) throw badRequest('Photos must be JPG, PNG or WebP');
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest('Photo is too large (max 8 MB)');

  for (const dir of imageDirs(slug)) {
    await fsp.mkdir(dir, { recursive: true });
    await removeImageFiles(dir, n); // replaces 1.png when a new 1.jpg arrives
    await fsp.writeFile(path.join(dir, `${n}.${ext}`), buffer);
  }
}

async function deleteImage(slug, number) {
  for (const dir of imageDirs(slug)) {
    if (exists(dir)) await removeImageFiles(dir, Number(number));
  }
}

/* ---------------- Whole folders ---------------- */

const tripFolders = (slug) => [
  path.join(paths.clientPublic, 'images', 'treks', slug),
  path.join(paths.clientDist, 'images', 'treks', slug),
];

// Slug changed: move its photo folders along
async function renameFolders(oldSlug, newSlug) {
  if (!oldSlug || oldSlug === newSlug) return;
  checkSlug(oldSlug);
  checkSlug(newSlug);

  const from = tripFolders(oldSlug);
  const to = tripFolders(newSlug);
  for (let i = 0; i < from.length; i += 1) {
    if (exists(from[i]) && !exists(to[i])) await fsp.rename(from[i], to[i]);
  }
}

module.exports = {
  listImages,
  saveImage,
  deleteImage,
  renameFolders,
};
