// Trip photos 1..5 (1 = cover), kept in the database (table trip_photos,
// see apps/server/src/utils/tripPhoto.js). Not on the server's disk: Render
// wipes it on every deploy. The website still shows them at
// /images/treks/<slug>/1.jpg … 5.jpg, and photo files in git
// (apps/client/public/images/treks/<slug>/) are copied in when the server starts.
// Brochures are on Hostinger (see the Brochures screen and ftpBrochure.js).
const { paths } = require('../../config');
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

function checkNumber(number) {
  const n = Number(number);
  if (!Number.isInteger(n) || n < 1 || n > tripPhoto.MAX_IMAGES) {
    throw badRequest(`Photo number must be 1 to ${tripPhoto.MAX_IMAGES}`);
  }
  return n;
}

// [{ number, file, url }] for 1..5, in order (url changes when the photo does)
const listImages = (trip) => tripPhoto.listPhotos(trip, [paths.clientPublic, paths.clientDist]);

async function saveImage(trip, number, dataUrl) {
  const n = checkNumber(number);
  const { mime, buffer } = decodeDataUrl(dataUrl);
  if (!IMAGE_TYPES[mime]) throw badRequest('Photos must be JPG, PNG or WebP');
  if (buffer.length > MAX_IMAGE_BYTES) throw badRequest('Photo is too large (max 8 MB)');
  try {
    await tripPhoto.savePhoto(trip.id, n, mime, buffer);
  } catch (error) {
    if (error.status === 400) throw badRequest(error.message);
    throw error;
  }
}

async function deleteImage(trip, number) {
  await tripPhoto.deletePhoto(trip.id, checkNumber(number));
}

// Photos belong to the trip id, so a new slug needs no move: only the
// website's list of photos is read again
function slugChanged() {
  tripPhoto.forget();
}

module.exports = {
  listImages,
  saveImage,
  deleteImage,
  slugChanged,
};
