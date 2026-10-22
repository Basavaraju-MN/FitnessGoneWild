// Database settings shared by the website (apps/server) and the
// admin portal (apps/admin-server), so both always use the same database.
//
// DB_* environment variables take priority. Without them,
// development uses the local MySQL and production uses Hostinger.
const isProduction = process.env.NODE_ENV === 'production';

const dbDefaults = isProduction
  ? {
    host: 'srv875.hstgr.io',
    user: 'u441995167_fitnessGone',
    password: 'FitnessGoneWild@123',
    database: 'u441995167_fitnessGone',
  }
  : {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'fgonewild',
  };

const db = {
  host: process.env.DB_HOST || dbDefaults.host,
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || dbDefaults.user,
  password: process.env.DB_PASSWORD ?? dbDefaults.password,
  database: process.env.DB_NAME || dbDefaults.database,
  // Few connections, kept open (Hostinger: 500 new connections per hour)
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 4),
  timezone: '+05:30',
  dateStrings: true,
};

module.exports = { db };
