// Search engines (Google, Bing) and link previews (WhatsApp, Facebook).
// The website is one page drawn by JavaScript, so the server adds what they
// need to the HTML it sends:
//   /robots.txt     what may be crawled (not the admin, API, invoices, payment pages)
//   /sitemap.xml    the home page and every published trek / trip
//   /               the home page's title, description, preview and business
//                   details, and its text (treks, FAQ) for crawlers
//   unknown pages   a real "404 not found" (search engines drop them)
// Trek / trip pages: utils/trekShare.js (uses the helpers here).
const fs = require('fs');
const path = require('path');
const { executeQuery } = require('../db/connection');

const SITE_NAME = 'The Fitness Gone Wild';
const HOME_TITLE = 'Weekend Treks & Trips from Bangalore | The Fitness Gone Wild';
const HOME_DESCRIPTION = 'Weekend treks, one day treks, backpacking trips and bike rides from Bangalore. Small groups, local guides, transport and food included. Book online with The Fitness Gone Wild.';
const INSTAGRAM = 'https://instagram.com/thefitnessgonewild';
const KEEP_MS = 10 * 60 * 1000; // home page text and sitemap are rebuilt every 10 minutes

// Treks (1 = Weekend treks, 2 = One day treks) live at /treks/<slug>, other trips at /trips/<slug>
const TREK_CATEGORY_IDS = [1, 2];
const isTrek = (trip) => TREK_CATEGORY_IDS.includes(Number(trip.category_id));
const tripPath = (trip) => `/${isTrek(trip) ? 'treks' : 'trips'}/${encodeURIComponent(trip.slug)}`;

const queries = {
  trips: `SELECT slug, name, category_id, blurb, duration_label, price, without_transport_price,
                 with_transport_price, DATE_FORMAT(updated_at, '%Y-%m-%d') AS updated
          FROM trips WHERE status = 'published' AND slug IS NOT NULL AND slug <> ''
          ORDER BY is_featured DESC, featured_order, name`,
  settings: "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('business_name','contact_phone','contact_email','business_address')",
  faq: 'SELECT question, answer FROM faq ORDER BY id',
};

const esc = (text) => String(text ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;');

const plain = (html) => String(html || '')
  .replace(/<(br|\/p|\/li|\/h\d)[^>]*>/gi, '\n')
  .replace(/<[^>]*>/g, ' ')
  .replace(/&nbsp;/gi, ' ')
  .replace(/&amp;/gi, '&')
  .replace(/[ \t]+/g, ' ')
  .replace(/\s*\n\s*/g, '\n')
  .trim();

// The site's one address for search engines: PUBLIC_SITE_URL, else the live
// domain in production (never the …onrender.com copy), else as the visitor used it
const siteUrl = (req) => (
  process.env.PUBLIC_SITE_URL
  || (process.env.NODE_ENV === 'production' ? 'https://thefitnessgonewild.in' : `${req.protocol}://${req.get('host')}`)
).replace(/\/+$/, '');

// JSON-LD block (structured data); "</" is escaped so it cannot end the script
const jsonLd = (data) => `<script type="application/ld+json">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`;

// The website's index.html, read again when a new build replaces it (its
// script names change with every build, so an old copy would break the page)
let template = { html: null, changed: 0 };
function indexHtml(clientDist) {
  const file = path.join(clientDist, 'index.html');
  const changed = fs.statSync(file).mtimeMs;
  if (template.html === null || template.changed !== changed) {
    template = { html: fs.readFileSync(file, 'utf8'), changed };
    homeKept.at = 0; // the home page is built again from the new file
  }
  return template.html;
}

/**
 * index.html with this page's title, description, extra <head> tags and the
 * text for crawlers inside #root (the website replaces it when it starts).
 */
function buildPage(clientDist, { title, description, head = [], body = '' }) {
  let html = indexHtml(clientDist);
  if (title) html = html.replace(/<title>[^<]*<\/title>/, `<title>${esc(title)}</title>`);
  if (description) html = html.replace(/<meta name="description" content="[^"]*"\s*\/?>/, `<meta name="description" content="${esc(description)}" />`);
  if (head.length) html = html.replace('</head>', `    ${head.join('\n    ')}\n  </head>`);
  if (body) html = html.replace('<div id="root"></div>', `<div id="root">${body}</div>`);
  return html;
}

// Preview tags (WhatsApp, Facebook, X) and the page's one true address
const shareTags = ({ title, description, image, url }) => [
  '<meta property="og:type" content="website" />',
  `<meta property="og:site_name" content="${esc(SITE_NAME)}" />`,
  `<meta property="og:title" content="${esc(title)}" />`,
  `<meta property="og:description" content="${esc(description)}" />`,
  image ? `<meta property="og:image" content="${esc(image)}" />` : '',
  `<meta property="og:url" content="${esc(url)}" />`,
  '<meta name="twitter:card" content="summary_large_image" />',
  `<link rel="canonical" href="${esc(url)}" />`,
].filter(Boolean);

// The business, for Google (name, phone, address, logo, Instagram)
async function business(base) {
  const rows = await executeQuery(queries.settings).catch(() => []);
  const s = Object.fromEntries((rows || []).map((r) => [r.setting_key, r.setting_value]));
  return {
    '@type': 'TravelAgency',
    '@id': `${base}/#business`,
    name: s.business_name || SITE_NAME,
    url: `${base}/`,
    logo: `${base}/images/logo.png`,
    image: `${base}/images/logo.png`,
    telephone: s.contact_phone || '+91 87623 50551',
    email: s.contact_email || undefined,
    address: { '@type': 'PostalAddress', streetAddress: s.business_address || 'Rajajinagar', addressLocality: 'Bengaluru', addressRegion: 'Karnataka', addressCountry: 'IN' },
    areaServed: 'Karnataka, India',
    sameAs: [INSTAGRAM],
  };
}

// Lowest price shown for a trip (without transport when there is one)
const fromPrice = (trip) => {
  const prices = [trip.without_transport_price, trip.price, trip.with_transport_price].map(Number).filter((p) => p > 0);
  return prices.length ? Math.min(...prices) : null;
};
const rupees = (n) => `₹${Number(n).toLocaleString('en-IN')}`;

const publishedTrips = () => executeQuery(queries.trips).catch((error) => {
  console.error('SEO: trips could not be read:', error?.message || error);
  return [];
});

/* ---------------- robots.txt ---------------- */
function robotsTxt(req, res) {
  res.type('text/plain');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send([
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    'Disallow: /invoice/',
    'Disallow: /payment',
    'Disallow: /hero-photo/',
    '',
    `Sitemap: ${siteUrl(req)}/sitemap.xml`,
    '',
  ].join('\n'));
}

/* ---------------- sitemap.xml ---------------- */
let sitemapKept = { at: 0, base: '', xml: '' };
async function sitemapXml(req, res, next) {
  try {
    const base = siteUrl(req);
    if (Date.now() - sitemapKept.at > KEEP_MS || sitemapKept.base !== base) {
      const trips = await publishedTrips();
      const urls = [
        `  <url><loc>${esc(base)}/</loc><changefreq>daily</changefreq><priority>1.0</priority></url>`,
        `  <url><loc>${esc(base)}/about</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>`,
        ...trips.map((t) => `  <url><loc>${esc(base + tripPath(t))}</loc>${t.updated ? `<lastmod>${t.updated}</lastmod>` : ''}<changefreq>weekly</changefreq><priority>0.8</priority></url>`),
      ];
      sitemapKept = {
        at: Date.now(),
        base,
        xml: `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
      };
    }
    res.type('application/xml');
    res.set('Cache-Control', 'public, max-age=3600');
    return res.send(sitemapKept.xml);
  } catch (error) {
    return next(error);
  }
}

/* ---------------- Home page ---------------- */
let homeKept = { at: 0, base: '', html: '' };
function homePage(clientDist) {
  return async (req, res, next) => {
    try {
      const base = siteUrl(req);
      indexHtml(clientDist); // a new build: forget the kept home page
      if (Date.now() - homeKept.at > KEEP_MS || homeKept.base !== base) {
        const [trips, faq, biz] = await Promise.all([
          publishedTrips(),
          executeQuery(queries.faq).catch(() => []),
          business(base),
        ]);
        const url = `${base}/`;
        const head = [
          ...shareTags({ title: HOME_TITLE, description: HOME_DESCRIPTION, image: `${base}/images/hero1.jpg`, url }),
          jsonLd({
            '@context': 'https://schema.org',
            '@graph': [
              biz,
              { '@type': 'WebSite', '@id': `${base}/#website`, name: SITE_NAME, url, publisher: { '@id': `${base}/#business` } },
            ],
          }),
        ];
        // Text for crawlers (and visitors without JavaScript); the website replaces it
        const body = `<main class="seo-text">
  <h1>Weekend treks and trips from Bangalore</h1>
  <p>${esc(HOME_DESCRIPTION)}</p>
  <h2>Upcoming treks and trips</h2>
  <ul>
    ${trips.map((t) => `<li><a href="${esc(tripPath(t))}">${esc(t.name)}</a>${t.duration_label ? ` · ${esc(t.duration_label)}` : ''}${fromPrice(t) ? ` · from ${rupees(fromPrice(t))}` : ''}${plain(t.blurb) ? ` — ${esc(plain(t.blurb).slice(0, 160))}` : ''}</li>`).join('\n    ')}
  </ul>
  ${faq.length ? `<h2>Questions</h2>\n  ${faq.map((f) => `<h3>${esc(f.question)}</h3><p>${esc(plain(f.answer))}</p>`).join('\n  ')}` : ''}
  <p>Call or WhatsApp ${esc(biz.telephone)} · <a href="${INSTAGRAM}">Instagram</a></p>
</main>`;
        homeKept = { at: Date.now(), base, html: buildPage(clientDist, { title: HOME_TITLE, description: HOME_DESCRIPTION, head, body }) };
      }
      res.set('Cache-Control', 'no-cache');
      return res.type('html').send(homeKept.html);
    } catch (error) {
      return next(error);
    }
  };
}

/* ---------------- Pages that are not real pages ---------------- */
// Addresses the website has, but which only show a "coming soon" page or are
// part of paying: shown normally, kept out of search results
const NOINDEX_PATHS = ['/treks', '/reviews', '/faq', '/contact', '/payment', '/payment-result'];

/* ---------------- About page ---------------- */
// /about with its own title, description, preview photo and text for
// crawlers, all from what the admin saved (About Page screen)
function aboutPage(clientDist) {
  return async (req, res, next) => {
    try {
      const base = siteUrl(req);
      const { content, photos, team } = await require('../components/about/aboutPage').getAbout();
      const title = `About us | ${SITE_NAME}`;
      const description = [content.banner.subtitle, plain(content.story.text).split('\n')[0]]
        .filter(Boolean).join(' ').slice(0, 200);
      const url = `${base}/about`;
      const image = `${base}${photos.banner || '/images/hero1.jpg'}`;
      const founder = content.founder.show && content.founder.name ? content.founder : null;
      const body = `<main class="seo-text">
  <p><a href="/">${esc(SITE_NAME)}</a></p>
  <h1>${esc(content.banner.title)}</h1>
  <p>${esc(content.banner.subtitle)}</p>
  <h2>${esc(content.story.title)}</h2>
  ${plain(content.story.text).split('\n').filter(Boolean).map((p) => `<p>${esc(p)}</p>`).join('\n  ')}
  ${founder ? `<h2>${esc(founder.name)} · ${esc(founder.role)}</h2>\n  <p>${esc(founder.note)}</p>` : ''}
  ${team.length ? `<h2>${esc(content.team.title)}</h2><ul>${team.map((m) => `<li>${esc(m.name)}${m.role ? ` · ${esc(m.role)}` : ''}</li>`).join('')}</ul>` : ''}
</main>`;
      res.set('Cache-Control', 'no-cache');
      return res.type('html').send(buildPage(clientDist, { title, description, head: shareTags({ title, description, image, url }), body }));
    } catch (error) {
      // Database down: the page still opens (the website loads the texts itself)
      console.error('About page tags failed:', error?.message || error);
      try {
        res.set('Cache-Control', 'no-cache');
        return res.type('html').send(buildPage(clientDist, { title: `About us | ${SITE_NAME}` }));
      } catch (pageError) {
        return next(pageError);
      }
    }
  };
}

/**
 * The website for any other address: known ones as usual (noindex where
 * there is nothing to find), unknown ones with "404 not found".
 */
function otherPage(clientDist) {
  return (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api')) return next();
    let page;
    try {
      page = buildPage(clientDist, { head: ['<meta name="robots" content="noindex" />'] });
    } catch (error) {
      return next(error);
    }
    const known = NOINDEX_PATHS.includes(req.path.replace(/\/+$/, '') || '/');
    res.set('Cache-Control', 'no-cache');
    if (!known) res.status(404);
    return res.type('html').send(page);
  };
}

module.exports = {
  SITE_NAME,
  esc,
  plain,
  siteUrl,
  jsonLd,
  indexHtml,
  buildPage,
  shareTags,
  business,
  fromPrice,
  rupees,
  isTrek,
  tripPath,
  robotsTxt,
  sitemapXml,
  homePage,
  aboutPage,
  otherPage,
};
