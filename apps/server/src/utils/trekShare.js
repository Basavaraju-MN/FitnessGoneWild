// Shareable trip links: https://<site>/treks/<slug> for treks, /trips/<slug> for other trips
// The website is one page, so a link preview (WhatsApp, Facebook, Instagram)
// or a search engine would only ever see the home page. For these addresses
// the server puts the trip's own title, description, photo, structured data
// (price, dates) and text into index.html before sending it.
const dbops = require('../db/dbops');
const { listPhotos } = require('./tripPhoto');
const {
  SITE_NAME, esc, plain, siteUrl, jsonLd, buildPage, shareTags, business, fromPrice, rupees, isTrek, tripPath,
} = require('./seo');

// The trip's first photo: from the database, else the file in the build
async function coverPath(clientDist, trek) {
  try {
    const [cover] = await listPhotos(trek, [clientDist]);
    if (cover) return cover.url;
  } catch (error) {
    console.error('Trip cover photo failed:', error?.message || error);
  }
  return '/images/hero1.jpg';
}

const dateText = (iso) => new Date(`${iso}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * Express handler for GET /treks/:slug and /trips/:slug — the website's
 * index.html with this trip's preview tags and text. The wrong one of the two
 * (e.g. /treks/goa for a trip) moves to the right address. Unknown or
 * unpublished trip: the normal page with "404 not found".
 */
function trekPage(clientDist) {
  return async (req, res, next) => {
    let trek = null;
    try {
      trek = await dbops.getTrekBySlug(String(req.params.slug || ''));
    } catch (error) {
      console.error('Trek link preview failed:', error?.message || error);
    }
    if (!trek) {
      try {
        return res.status(404).type('html').send(buildPage(clientDist, { head: ['<meta name="robots" content="noindex" />'] }));
      } catch (error) {
        return next(error);
      }
    }

    // Treks under /treks/, other trips under /trips/ (old shared links still work)
    const pagePath = tripPath(trek);
    if (req.path !== pagePath) {
      const query = req.originalUrl.includes('?') ? req.originalUrl.slice(req.originalUrl.indexOf('?')) : '';
      return res.redirect(301, `${pagePath}${query}`);
    }

    try {
      const base = siteUrl(req);
      const word = isTrek(trek) ? 'trek' : 'trip';
      const title = `${trek.name} | ${SITE_NAME}`;
      const description = (plain(trek.blurb).replace(/\n/g, ' ') || `${trek.duration_label || ''} ${word} from Bangalore with ${SITE_NAME}`).slice(0, 200);
      const image = `${base}${await coverPath(clientDist, trek)}`;
      const url = `${base}${pagePath}`;
      const price = fromPrice(trek);
      const [dates, biz] = await Promise.all([
        dbops.getTrekDates(trek.id).catch(() => []),
        business(base),
      ]);
      const openDates = dates.filter((d) => d.status !== 'full');

      const trip = {
        '@type': 'TouristTrip',
        name: trek.name,
        description,
        image,
        url,
        touristType: 'Adventure',
        provider: { '@id': `${base}/#business` },
        ...(price ? {
          offers: {
            '@type': 'Offer',
            price,
            priceCurrency: 'INR',
            url,
            availability: openDates.length ? 'https://schema.org/InStock' : 'https://schema.org/SoldOut',
          },
        } : {}),
        ...(openDates.length ? {
          subjectOf: openDates.slice(0, 6).map((d) => ({
            '@type': 'Event',
            name: trek.name,
            startDate: d.start_date,
            endDate: d.end_date || d.start_date,
            eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
            eventStatus: 'https://schema.org/EventScheduled',
            location: { '@type': 'Place', name: trek.name, address: { '@type': 'PostalAddress', addressRegion: 'Karnataka', addressCountry: 'IN' } },
            organizer: { '@id': `${base}/#business` },
            image,
            ...(price ? { offers: { '@type': 'Offer', price, priceCurrency: 'INR', url, availability: 'https://schema.org/InStock' } } : {}),
          })),
        } : {}),
      };

      const head = [
        ...shareTags({ title, description, image, url }),
        jsonLd({
          '@context': 'https://schema.org',
          '@graph': [
            biz,
            trip,
            {
              '@type': 'BreadcrumbList',
              itemListElement: [
                { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${base}/` },
                { '@type': 'ListItem', position: 2, name: trek.name, item: url },
              ],
            },
          ],
        }),
      ];

      // Text for crawlers (and visitors without JavaScript); the website replaces it
      const lines = (text) => plain(text).split('\n').filter(Boolean);
      const list = (raw) => String(raw || '').split('||').map((s) => plain(s)).filter(Boolean);
      const body = `<main class="seo-text">
  <p><a href="/">${esc(SITE_NAME)}</a></p>
  <h1>${esc(trek.name)}</h1>
  <p>${[trek.duration_label, trek.difficulty && isTrek(trek) ? `${trek.difficulty} ${word}` : '', price ? `from ${rupees(price)} per person` : ''].filter(Boolean).map(esc).join(' · ')}</p>
  ${lines(trek.blurb).map((l) => `<p>${esc(l)}</p>`).join('\n  ')}
  ${lines(trek.description).map((l) => `<p>${esc(l)}</p>`).join('\n  ')}
  ${lines(trek.itinerary).length ? `<h2>Itinerary</h2>\n  ${lines(trek.itinerary).map((l) => `<p>${esc(l)}</p>`).join('\n  ')}` : ''}
  ${list(trek.includes).length ? `<h2>Included</h2><ul>${list(trek.includes).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
  ${list(trek.exclusions).length ? `<h2>Not included</h2><ul>${list(trek.exclusions).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}
  ${openDates.length ? `<h2>Upcoming dates</h2><ul>${openDates.slice(0, 8).map((d) => `<li>${esc(dateText(d.start_date))}${d.end_date && d.end_date !== d.start_date ? ` – ${esc(dateText(d.end_date))}` : ''}</li>`).join('')}</ul>` : ''}
  <p>Book online or WhatsApp ${esc(biz.telephone)}.</p>
</main>`;

      res.set('Cache-Control', 'public, max-age=300');
      return res.type('html').send(buildPage(clientDist, { title, description, head, body }));
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = { trekPage };
