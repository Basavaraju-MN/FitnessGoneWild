// Brochures kept on Hostinger (managed in Hostinger's File Manager, folder
// public/brochures/), one PDF per trek named by its slug:
//   <BROCHURE_BASE_URL>/<slug>.pdf     e.g. https://yourdomain.com/brochures/kudremukh.pdf
// Set BROCHURE_BASE_URL on Render (and in apps/server/.env locally).
// Without it, or when a trek's file is not there, the website uses its
// own brochures folder as before.
const path = require('path');

// The admin can run on its own locally: the setting lives in apps/server/.env
require('dotenv').config({ path: path.join(__dirname, '../../../.env'), quiet: true });

const baseUrl = () => String(process.env.BROCHURE_BASE_URL || '').trim().replace(/\/+$/, '');
const isConfigured = () => /^https?:\/\//i.test(baseUrl());

const fileNameFor = (slug) => `${slug}.pdf`;
const urlFor = (slug) => `${baseUrl()}/${encodeURIComponent(fileNameFor(slug))}`;

const validSlug = (slug) => /^[a-z0-9_-]+$/i.test(String(slug || ''));

/**
 * { url, fileName, size } when the trek's PDF is on Hostinger, else null.
 * Quick HEAD request; a slow or missing file never blocks the page.
 */
async function findBrochure(slug, timeoutMs = 6000) {
  if (!isConfigured() || !validSlug(slug)) return null;
  const url = urlFor(slug);
  try {
    const response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: AbortSignal.timeout(timeoutMs) });
    if (!response.ok) return null;
    const type = String(response.headers.get('content-type') || '');
    // Some hosts answer a missing file with an HTML page and status 200
    if (type && !/pdf|octet-stream/i.test(type)) return null;
    return { url, fileName: fileNameFor(slug), size: Number(response.headers.get('content-length')) || null };
  } catch {
    return null;
  }
}

module.exports = { isConfigured, baseUrl, urlFor, fileNameFor, findBrochure };
