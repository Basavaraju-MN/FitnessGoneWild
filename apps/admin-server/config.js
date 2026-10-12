const path = require('path');

require('dotenv').config({ path: path.join(__dirname, '.env') });

const isProduction = process.env.NODE_ENV === 'production';

// ADMIN_JWT_SECRET on Render; JWT_SECRET in the local .env
const jwtSecret = process.env.ADMIN_JWT_SECRET || process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('ADMIN_JWT_SECRET is not configured');
}

module.exports = {
  isProduction,
  port: Number(process.env.PORT || 4100),

  jwtSecret,
  sessionHours: 12,
  cookieName: 'fgw_admin',

  adminOrigins: (process.env.ADMIN_ORIGIN || 'http://localhost:5175')
    .split(',')
    .map((origin) => origin.trim().replace(/\/$/, ''))
    .filter(Boolean),

  // Which roles can open which module
  permissions: {
    dashboard: ['admin', 'sales', 'operations'],
    packages: ['admin'],
    bookings: ['admin', 'sales', 'operations'],
    coordination: ['admin', 'operations'],
    customers: ['admin', 'sales', 'operations'],
    enquiries: ['admin', 'sales'],
    brochures: ['admin', 'sales'],
    payments: ['admin'],
    reports: ['admin', 'sales', 'operations'],
    masters: ['admin', 'operations'],
    users: ['admin'],
    settings: ['admin'],
  },
};
