// Google Business Profile API: sign-in (OAuth), business locations and
// reviews. Plain fetch, no Google SDK.
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const { google, jwtSecret } = require('../../config');
const { badRequest, HttpError } = require('../../utils/http');

const SCOPES = ['openid', 'email', 'https://www.googleapis.com/auth/business.manage'];
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';
const ACCOUNTS_URL = 'https://mybusinessaccountmanagement.googleapis.com/v1/accounts';
const LOCATIONS_URL = 'https://mybusinessbusinessinformation.googleapis.com/v1';
const REVIEWS_URL = 'https://mybusiness.googleapis.com/v4';

const STARS = { ONE: 1, TWO: 2, THREE: 3, FOUR: 4, FIVE: 5 };

const isConfigured = () => Boolean(google.clientId && google.clientSecret);

// Redirect URI: GOOGLE_REDIRECT_URI, or this server's own callback URL
const redirectUriFor = (req) =>
  google.redirectUri || `${req.protocol}://${req.get('host')}${req.baseUrl}/google/callback`;

/* ---------- Refresh token, encrypted at rest ---------- */
const key = crypto.createHash('sha256').update(`google:${jwtSecret}`).digest();

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const data = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data].map((part) => part.toString('base64')).join('.');
}

function decrypt(value) {
  const [iv, tag, data] = String(value).split('.').map((part) => Buffer.from(part, 'base64'));
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

/* ---------- OAuth ---------- */
// The state proves the callback belongs to a sign-in an admin started
function authUrl(req, adminId) {
  if (!isConfigured()) throw badRequest('Google is not set up: add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET');

  const state = jwt.sign({ purpose: 'google-connect', adminId }, jwtSecret, { expiresIn: '15m' });
  const params = new URLSearchParams({
    client_id: google.clientId,
    redirect_uri: redirectUriFor(req),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline', // gives a refresh token for the automatic sync
    prompt: 'consent',
    include_granted_scopes: 'true',
    state,
  });
  return `${AUTH_URL}?${params}`;
}

function readState(state) {
  try {
    const data = jwt.verify(String(state || ''), jwtSecret);
    if (data.purpose !== 'google-connect') throw new Error('wrong purpose');
    return data;
  } catch {
    throw badRequest('Google sign-in expired, please try again');
  }
}

async function postToken(params) {
  const response = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: google.clientId, client_secret: google.clientSecret, ...params }),
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new HttpError(400, `Google sign-in failed: ${body.error_description || body.error || response.status}`);
  }
  return body;
}

const exchangeCode = (req, code) =>
  postToken({ code, grant_type: 'authorization_code', redirect_uri: redirectUriFor(req) });

async function accessTokenFrom(encryptedRefreshToken) {
  const { access_token: token } = await postToken({
    refresh_token: decrypt(encryptedRefreshToken),
    grant_type: 'refresh_token',
  });
  return token;
}

/* ---------- API calls ---------- */
async function getJson(url, token) {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = body.error?.message || response.statusText;
    // 403 with "has not been used" / "not enabled": API access not approved or enabled yet
    throw new HttpError(response.status === 401 ? 401 : 502, `Google: ${message}`);
  }
  return body;
}

async function getEmail(token) {
  return (await getJson(USERINFO_URL, token)).email || null;
}

// Every business location the signed-in account can manage
async function listLocations(token) {
  const { accounts = [] } = await getJson(ACCOUNTS_URL, token);
  const locations = [];

  for (const account of accounts) {
    let pageToken = '';
    do {
      const params = new URLSearchParams({ readMask: 'name,title,storefrontAddress', pageSize: '100' });
      if (pageToken) params.set('pageToken', pageToken);
      const page = await getJson(`${LOCATIONS_URL}/${account.name}/locations?${params}`, token);
      for (const location of page.locations || []) {
        const address = location.storefrontAddress;
        locations.push({
          account_name: account.name, // accounts/123
          location_name: location.name, // locations/456
          title: location.title,
          address: address ? [...(address.addressLines || []), address.locality].filter(Boolean).join(', ') : '',
        });
      }
      pageToken = page.nextPageToken || '';
    } while (pageToken);
  }

  return locations;
}

// All reviews of one location (Google pages them 50 at a time)
async function listReviews(token, accountName, locationName) {
  const reviews = [];
  let averageRating = null;
  let totalReviewCount = 0;
  let pageToken = '';

  do {
    const params = new URLSearchParams({ pageSize: '50' });
    if (pageToken) params.set('pageToken', pageToken);
    const page = await getJson(`${REVIEWS_URL}/${accountName}/${locationName}/reviews?${params}`, token);

    reviews.push(...(page.reviews || []));
    averageRating = page.averageRating ?? averageRating;
    totalReviewCount = page.totalReviewCount ?? totalReviewCount;
    pageToken = page.nextPageToken || '';
  } while (pageToken);

  return { reviews, averageRating, totalReviewCount };
}

// Google review -> reviews table columns
function toRow(review) {
  const toDate = (value) => (value ? new Date(value) : null);
  return {
    google_review_id: review.reviewId,
    author_name: (review.reviewer?.isAnonymous ? 'Google user' : review.reviewer?.displayName || 'Google user').slice(0, 120),
    author_photo_url: review.reviewer?.profilePhotoUrl?.slice(0, 500) || null,
    rating: STARS[review.starRating] || 5,
    body: (review.comment || '').slice(0, 4100),
    owner_reply: review.reviewReply?.comment?.slice(0, 4100) || null,
    created_at: toDate(review.createTime),
    updated_at: toDate(review.updateTime),
  };
}

module.exports = {
  isConfigured,
  redirectUriFor,
  encrypt,
  authUrl,
  readState,
  exchangeCode,
  accessTokenFrom,
  getEmail,
  listLocations,
  listReviews,
  toRow,
};
