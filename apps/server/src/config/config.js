const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const logDirectory = path.join(__dirname, '../logs');

const db = {
  host: process.env.DB_HOST || (isProduction ? undefined : 'localhost'),
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || (isProduction ? undefined : 'root'),
  password: process.env.DB_PASSWORD || (isProduction ? undefined : ''),
  database: process.env.DB_NAME || (isProduction ? undefined : 'fgonewild'),
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 10),
  timezone: process.env.DB_TIMEZONE || '+05:30',
  dateStrings: true,
};

if (isProduction) {
  const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    console.warn(
      `Database environment variables are not configured yet: ${missing.join(', ')}`
    );
  }
}

const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

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
};
