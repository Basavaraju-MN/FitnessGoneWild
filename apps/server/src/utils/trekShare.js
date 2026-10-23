// Shareable trek links: https://<site>/treks/<slug>
// The website is one page, so a link preview (WhatsApp, Facebook, Instagram)
// would only ever show the home page. For /treks/<slug> the server puts the
// trek's own title, description and photo into index.html before sending it.
const fs = require('fs');
const path = require('path');
const dbops = require('../db/dbops');

const SITE_NAME = 'The Fitness Gone Wild';

const esc = (text) => String(text ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const plain = (html) => String(html || '')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/\s+/g, ' ')
  .trim();

// The site's address as the visitor used it (https behind Render / Cloudflare)
const siteUrl = (req) => (process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get('host')}`).replace(/\/+$/, '');

// First trek photo that exists: public/images/treks/<slug>/1.jpg (or png/webp)
function coverPath(clientDist, slug) {
  for (const ext of ['jpg', 'jpeg', 'png', 'webp']) {
    if (fs.existsSync(path.join(clientDist, 'images', 'treks', slug, `1.${ext}`))) {
      return `/images/treks/${encodeURIComponent(slug)}/1.${ext}`;
    }
  }
  return '/images/hero1.jpg';
}

let template = null; // index.html, read once
function indexHtml(clientDist) {
  if (template === null) template = fs.readFileSync(path.join(clientDist, 'index.html'), 'utf8');
  return template;
}

/**
 * Express handler for GET /treks/:slug — the website's index.html with this
 * trek's preview tags. Unknown trek: the normal page (it shows "not found").
 */
function trekPage(clientDist) {
  return async (req, res, next) => {
    let html;
    try {
      html = indexHtml(clientDist);
    } catch (error) {
      return next(error);
    }

    let trek = null;
    try {
      trek = await dbops.getTrekBySlug(String(req.params.slug || ''));
    } catch (error) {
      console.error('Trek link preview failed:', error?.message || error);
    }
    if (!trek) return res.type('html').send(html);

    const base = siteUrl(req);
    const title = `${trek.name} | ${SITE_NAME}`;
    const description = (plain(trek.blurb) || `${trek.duration_label || ''} trek with ${SITE_NAME}`).slice(0, 200);
    const image = `${base}${coverPath(clientDist, trek.slug)}`;
    const url = `${base}/treks/${encodeURIComponent(trek.slug)}`;

    const tags = [
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
      `<meta property="og:title" content="${esc(title)}" />`,
      `<meta property="og:description" content="${esc(description)}" />`,
      `<meta property="og:image" content="${esc(image)}" />`,
      `<meta property="og:url" content="${esc(url)}" />`,
      `<meta name="twitter:card" content="summary_large_image" />`,
      `<link rel="canonical" href="${esc(url)}" />`,
    ].join('\n    ');

    const page = html
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`)
      .replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}" />`)
      .replace('</head>', `    ${tags}\n  </head>`);

    res.set('Cache-Control', 'public, max-age=300');
    return res.type('html').send(page);
  };
}

module.exports = { trekPage };
