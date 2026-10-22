// Short cache for the website's public, read-only API answers (treks,
// categories, reviews, hero, FAQ …). Every home page visit asks for all of
// them at once; without the cache each visit opens new database connections,
// and Hostinger allows only 500 new connections per hour.
// Any change saved in the admin clears the cache, so edits show at once.
const TTL_MS = 2 * 60 * 1000;
const MAX_ENTRIES = 300;

// Website API paths (under /api) that only read public data
const CACHED_PATHS = new Set([
  '/trek-category',
  '/get-all-trek-details',
  '/featured-trips',
  '/reviews',
  '/hero',
  '/why-us',
  '/faq',
  '/pickup-points',
  '/site-filters',
]);

const cache = new Map(); // url -> { at, body }

const clearApiCache = () => cache.clear();

// Express middleware for app.use('/api', …)
function cachePublicApi(req, res, next) {
  if (req.method !== 'GET' || !CACHED_PATHS.has(req.path)) return next();

  const key = req.originalUrl;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) {
    res.set('X-Cache', 'HIT');
    return res.status(200).json(hit.body);
  }

  // Keep the answer when it is a success
  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200 && body?.success !== false) {
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), body });
    }
    res.set('X-Cache', 'MISS');
    return json(body);
  };
  return next();
}

// Express middleware for app.use('/api/admin', …): a saved change clears the cache
function clearOnAdminChange(req, res, next) {
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'OPTIONS') {
    res.on('finish', () => {
      if (res.statusCode < 400) clearApiCache();
    });
  }
  next();
}

module.exports = { cachePublicApi, clearOnAdminChange, clearApiCache };
