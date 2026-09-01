const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const logDirectory = path.join(__dirname, '../logs');

const {
  StandardCheckoutClient,
  Env,
} = require('@phonepe-pg/pg-sdk-node');

const db = {
  host: 'srv875.hstgr.io',
  port: 3306,
  user: 'u441995167_fitnessGone',
  password: 'FitnessGoneWild@123',
  database: 'u441995167_fitnessGone',
  connectionLimit: 10,
  timezone: '+05:30',
  dateStrings: true,
};

const clientOrigins = (
  process.env.CLIENT_URL || 'http://localhost:5173'
)
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);


// ================================
// PHONEPE CONFIG
// ================================

const clientId = process.env.PHONEPE_CLIENT_ID;
const clientSecret = process.env.PHONEPE_CLIENT_SECRET;
const clientVersion = Number(
  process.env.PHONEPE_CLIENT_VERSION || 1
);

const phonePeEnv =
  process.env.PHONEPE_ENV === 'PRODUCTION'
    ? Env.PRODUCTION
    : Env.SANDBOX;


// ================================
// VALIDATION
// ================================

if (!clientId) {
  throw new Error('PHONEPE_CLIENT_ID is not configured');
}

if (!clientSecret) {
  throw new Error('PHONEPE_CLIENT_SECRET is not configured');
}

if (!clientVersion) {
  throw new Error('PHONEPE_CLIENT_VERSION is not configured');
}

const phonePeClient =
  StandardCheckoutClient.getInstance(
    clientId,
    clientSecret,
    clientVersion,
    phonePeEnv
  );


module.exports = {
  db,
  clientOrigins,

  log: {
    logDirectory,
    interval: '1d',
  },

  cookieOptions: {
    httpOnly: true,
    secure: isProduction,
    maxAge: 0,
    sameSite: 'lax',
  },

  phonePeClient,
};