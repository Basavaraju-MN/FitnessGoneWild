// Trip photos 1..5 (1 = cover), kept only in the database (table trip_photos,
// by trip id + position; see apps/server/src/utils/tripPhoto.js). Never on
// the server's disk: Render wipes it on every deploy. The website shows them
// at /trip-photo/<trip id>/<position>.
// Brochures are on Hostinger (see the Brochures screen and ftpBrochure.js).
const { badRequest } = require('../../utils/http');
const tripPhoto = require('../../../server/src/utils/tripPhoto');

const IMAGE_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

// "data:image/png;base64,AAAA" -> { mime, buffer }
function decodeDataUrl(dataUrl) {
  const match = /^data:([\w/+.-]+);base64,(.+)$/s.exec(String(dataUrl || ''));
  if (!match) throw badRequest('The file could not be read. Please choose it again.');
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

function checkPosition(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > tripPhoto.MAX_IMAGES) {
    throw badRequest(`Photo number must be 1 to ${tripPhoto.MAX_IMAGES}`);
  }
  return n;
}

// [{ number, file, url }] in order (url changes when the photo does)
async function listImages(trip) {
  const photos = await tripPhoto.listPhotos(trip.id);
  return photos.map(({ position, file, url }) => ({ number: position, file, url }));
}

async function saveImage(trip, number, dataUrl) {
  const position = checkPosition(number);
  const { mime, buffer } = decodeDataUrl(dataUrl);
  if (!IMAGE_TYPES[mime]) throw badRequest('Photos must be JPG, PNG or WebP');
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest('Photo is too large (max 8 MB)');
  try {
    await tripPhoto.savePhoto(trip.id, position, mime, buffer);
  } catch (error) {
    if (error.status === 400) throw badRequest(error.message);
    throw error;
  }
}

async function deleteImage(trip, number) {
  await tripPhoto.deletePhoto(trip.id, checkPosition(number));
}

// Photos belong to the trip id, so a new slug needs no move: only the
// list of old /images/treks/<slug>/ addresses is read again
function slugChanged() {
  tripPhoto.forget();
}

module.exports = {
  listImages,
  saveImage,
  deleteImage,
  slugChanged,
};
