// Reviews screen: website + Google reviews, and the Google Business
// Profile connection that keeps Google reviews in sync.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const { google, adminAppUrl } = require('../../config');
const { badRequest, notFound, logActivity } = require('../../utils/http');
const gbp = require('./googleBusiness');

const REVIEW_STATUSES = ['pending', 'published', 'hidden'];

/* ---------- Reviews ---------- */
const getReviews = () => dbops.getReviews();

async function updateReview(admin, id, body) {
  const status = body?.status;
  if (!REVIEW_STATUSES.includes(status)) throw badRequest(`Status must be one of: ${REVIEW_STATUSES.join(', ')}`);

  if (!(await dbops.updateReviewStatus(id, status, admin.id))) throw notFound('Review not found');
  await logActivity(admin, 'update', 'review', id, `status=${status}`);
  return { id, status };
}

/* ---------- Google connection ---------- */
async function getGoogleStatus(req) {
  const row = await dbops.getGoogleBusiness();
  return {
    configured: gbp.isConfigured(),
    redirectUri: gbp.redirectUriFor(req),
    connected: Boolean(row?.refresh_token),
    email: row?.connected_email || null,
    locationName: row?.location_name || null,
    locationTitle: row?.location_title || null,
    averageRating: row?.average_rating != null ? Number(row.average_rating) : null,
    totalReviews: row?.total_reviews ?? null,
    lastSyncedAt: row?.last_synced_at || null,
    lastError: row?.last_error || null,
    syncHours: google.syncHours,
  };
}

const getGoogleConnectUrl = (req, admin) => gbp.authUrl(req, admin.id);

// Google sends the browser back here; returns where to send it next
async function finishGoogleConnect(req) {
  const back = (result) => `${adminAppUrl.replace(/\/?$/, '/')}reviews?google=${encodeURIComponent(result)}`;

  if (req.query.error) return back(req.query.error === 'access_denied' ? 'cancelled' : 'failed');

  try {
    const { adminId } = gbp.readState(req.query.state);
    const tokens = await gbp.exchangeCode(req, String(req.query.code || ''));
    if (!tokens.refresh_token) throw badRequest('Google did not return a refresh token');

    const email = await gbp.getEmail(tokens.access_token).catch(() => null);
    await dbops.saveGoogleConnection({ refreshToken: gbp.encrypt(tokens.refresh_token), email, adminId });

    // One business location: pick it and sync straight away
    const locations = await gbp.listLocations(tokens.access_token).catch(() => []);
    if (locations.length === 1) {
      await dbops.setGoogleLocation(locations[0]);
      await syncGoogleReviews().catch(() => {});
    }
    await logActivity({ id: adminId }, 'connect', 'google_business', null, email || '');
    return back('connected');
  } catch (error) {
    console.error('Google connect failed:', error.message);
    await dbops.setGoogleError(error.message.slice(0, 500)).catch(() => {});
    return back('failed');
  }
}

async function accessToken() {
  const row = await dbops.getGoogleBusiness();
  if (!row?.refresh_token) throw badRequest('Connect your Google account first');
  return { row, token: await gbp.accessTokenFrom(row.refresh_token) };
}

async function getGoogleLocations() {
  const { token } = await accessToken();
  return gbp.listLocations(token);
}

async function setGoogleLocation(admin, body) {
  const { account_name: accountName, location_name: locationName } = body || {};
  const locations = await getGoogleLocations();
  const location = locations.find((l) => l.account_name === accountName && l.location_name === locationName);
  if (!location) throw badRequest('Pick one of your Google business locations');

  await dbops.setGoogleLocation(location);
  await logActivity(admin, 'update', 'google_business', null, location.title);
  return syncGoogleReviews();
}

async function disconnectGoogle(admin) {
  await dbops.clearGoogleConnection();
  await logActivity(admin, 'disconnect', 'google_business', null, '');
  return true; // synced reviews stay in the table
}

/* ---------- Sync ---------- */
let syncing = null; // one sync at a time

function syncGoogleReviews() {
  if (!syncing) {
    syncing = runSync().finally(() => {
      syncing = null;
    });
  }
  return syncing;
}

async function runSync() {
  const { row, token } = await accessToken();
  if (!row.location_name) throw badRequest('Choose which Google business location to sync');

  try {
    const { reviews, averageRating, totalReviewCount } = await gbp.listReviews(token, row.account_name, row.location_name);
    const rows = reviews.map(gbp.toRow).filter((r) => r.google_review_id);

    const known = new Set(await dbops.getGoogleReviewIds());
    for (const review of rows) await dbops.upsertGoogleReview(review);

    // Reviews deleted on Google are removed here too
    const removed = await dbops.deleteGoogleReviewsExcept(rows.map((r) => r.google_review_id));

    await dbops.setGoogleSynced({ averageRating, totalReviews: totalReviewCount || rows.length });
    return {
      total: rows.length,
      added: rows.filter((r) => !known.has(r.google_review_id)).length,
      removed,
      averageRating,
    };
  } catch (error) {
    await dbops.setGoogleError(error.message.slice(0, 500)).catch(() => {});
    throw error;
  }
}

// Background sync every GOOGLE_SYNC_HOURS while the server runs
let timer = null;
function startAutoSync() {
  if (timer || !gbp.isConfigured() || !(google.syncHours > 0)) return;

  const run = async () => {
    try {
      const row = await dbops.getGoogleBusiness();
      if (!row?.refresh_token || !row.location_name) return;
      const result = await syncGoogleReviews();
      console.log(`Google reviews synced: ${result.total} total, ${result.added} new`);
    } catch (error) {
      console.error('Google reviews sync failed:', error.message);
    }
  };

  setTimeout(run, 60 * 1000).unref(); // shortly after start
  timer = setInterval(run, google.syncHours * 60 * 60 * 1000);
  timer.unref();
}

module.exports = {
  getReviews,
  updateReview,
  getGoogleStatus,
  getGoogleConnectUrl,
  finishGoogleConnect,
  getGoogleLocations,
  setGoogleLocation,
  disconnectGoogle,
  syncGoogleReviews,
  startAutoSync,
};
