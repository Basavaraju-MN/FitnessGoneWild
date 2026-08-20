const path = require('path');

const isProduction = process.env.NODE_ENV === 'production';

const logDirectory = path.join(__dirname, '../logs');

const db = {
  host: 'srv875.hstgr.io',
  port: 3306,
  user: 'u441995167_fitnessGone',
  password: 'Password@123',
  database: 'u441995167_fitnessGone',
  connectionLimit: 10,
  timezone: '+05:30',
  dateStrings: true,
};

// if (isProduction) {
//   const missing = ['DB_HOST', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'].filter(
//     (key) => !process.env[key]
//   );

//   if (missing.length > 0) {
//     console.warn(
//       `Database environment variables are not configured yet: ${missing.join(', ')}`
//     );
//   }
// }

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
