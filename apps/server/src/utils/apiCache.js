// Short cache for the website's public, read-only API answers (treks,
// categories, reviews, hero, FAQ …). Every home page visit asks for all of
// them at once; without the cache each visit opens new database connections,
// and Hostinger allows only 500 new connections per hour.
// Many visitors arriving together while the cache is empty share ONE
// database read. Any change saved in the admin clears the cache, so edits
// show at once.
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
  '/trip-terms',
  '/site-filters',
]);

const cache = new Map(); // url -> { at, body }
const pending = new Map(); // url -> Promise of the body being read now (null if it failed)

const clearApiCache = () => cache.clear();

const fresh = (key) => {
  const hit = cache.get(key);
  return hit && Date.now() - hit.at < TTL_MS ? hit : null;
};

// Express middleware for app.use('/api', …)
async function cachePublicApi(req, res, next) {
  if (req.method !== 'GET' || !CACHED_PATHS.has(req.path)) return next();

  const key = req.originalUrl;
  let hit = fresh(key);

  // Someone is reading this right now: wait for that answer
  if (!hit && pending.has(key)) {
    const body = await pending.get(key);
    if (body) hit = { body };
  }
  if (hit) {
    res.set('X-Cache', 'HIT');
    return res.status(200).json(hit.body);
  }

  // This request reads the database; the others wait for it
  let settle;
  pending.set(key, new Promise((resolve) => { settle = resolve; }));
  const done = (body) => {
    if (pending.has(key)) {
      pending.delete(key);
      settle(body);
    }
  };

  const json = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode === 200 && body?.success !== false) {
      if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
      cache.set(key, { at: Date.now(), body });
      done(body);
    } else {
      done(null); // not cached: waiting requests read it themselves
    }
    res.set('X-Cache', 'MISS');
    return json(body);
  };
  res.on('close', () => done(null));
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
