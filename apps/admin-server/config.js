const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const isProduction = process.env.NODE_ENV === 'production';

// ADMIN_JWT_SECRET on Render; JWT_SECRET in the local .env
const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('ADMIN_JWT_SECRET is not configured');
}

// Where trip photos and brochures are stored (read by the website)
const appsDir = path.resolve(__dirname, '..');

module.exports = {
  isProduction,

  paths: {
    // Source photos (kept in the repo) and the built site that is served
    clientPublic: path.join(appsDir, 'client', 'public'),
    clientDist: path.join(appsDir, 'client', 'dist'),
    brochures: path.join(appsDir, 'server', 'brochures'),
  },
  port: Number(process.env.PORT || 4100),

  jwtSecret,
  sessionHours: 12,
  cookieName: 'fgw_admin',

  adminOrigins: (process.env.ADMIN_ORIGIN || 'http://localhost:5175')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),

  // Google Business Profile (reviews). Set on Render and in the local .env;
  // the redirect URI must also be added to the OAuth client in Google Cloud.
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    // Empty = worked out from the request (…/api/admin/google/callback)
    redirectUri: process.env.GOOGLE_REDIRECT_URI || '',
    syncHours: Number(process.env.GOOGLE_SYNC_HOURS || 6),
  },
  // Public website address, used in invoice links sent to customers
  publicSiteUrl: (process.env.PUBLIC_SITE_URL || (isProduction ? 'https://thefitnessgonewild.in' : 'http://localhost:4000')).replace(/\/+$/, ''),

  // Where the browser goes back to after connecting Google
  adminAppUrl: process.env.ADMIN_APP_URL || (isProduction ? '/admin/' : 'http://localhost:5175/'),

  // Which roles can open which module: only the starting point. Admins
  // change it in Users & Roles → Role permissions (table role_permissions).
  permissions: {
    dashboard: ['admin', 'sales', 'operations'],
    packages: ['admin'],
    brochures: ['admin'],
    bookings: ['admin', 'sales', 'operations'],
    coordination: ['admin', 'operations'],
    customers: ['admin', 'sales', 'operations'],
    enquiries: ['admin', 'sales'],
    payments: ['admin'],
    reports: ['admin', 'sales', 'operations'],
    guides: ['admin', 'operations'],
    'pickup-points': ['admin', 'operations'],
    regions: ['admin'],
    reviews: ['admin'],
    activity: ['admin'],
    hero: ['admin'],
    users: ['admin'],
    settings: ['admin'],
  },
};
