const mysql = require('mysql2');
// Shared with the admin portal, which uses this same pool
const { db } = require('../config/database');

const pool = mysql.createPool({
  host: db.host,
  port: db.port,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: db.connectionLimit,
  queueLimit: 0,
  timezone: db.timezone,
  dateStrings: db.dateStrings,
  // Hostinger allows only 500 NEW connections per hour for this user:
  // keep a few connections open and reuse them, instead of opening and
  // closing them for every burst of queries.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: db.connectionLimit,
  idleTimeout: 10 * 60 * 1000,
  connectTimeout: 15000,
});

// Run MySQL in IST (Hostinger's server is UTC): NOW()/CURDATE() give Indian
// time and TIMESTAMP columns are read back in IST
pool.on('connection', (connection) => {
  connection.query(`SET time_zone = '${db.timezone}'`);
});

const promisePool = pool.promise();

const RETRYABLE_ERROR_CODES = new Set([
  'PROTOCOL_CONNECTION_LOST',
  'ECONNRESET',
  'ETIMEDOUT',
  'EPIPE',
  'ECONNREFUSED',
  'PROTOCOL_SEQUENCE_TIMEOUT',
  // Hostinger limits simultaneous connections per database user
  'ER_CON_COUNT_ERROR',
  'ER_TOO_MANY_USER_CONNECTIONS',
  // Not ER_USER_LIMIT_REACHED (hourly limit): retrying only uses up more
]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Could not even open a connection (server unreachable / firewall block),
// as opposed to an open connection that dropped mid-query
const isConnectFailure = (error) => error?.syscall === 'connect'
  || (Array.isArray(error?.errors) && error.errors.some((e) => e?.syscall === 'connect'));

// After a connect failure, fail every query at once for a short while instead
// of opening new connections: retry storms against an unreachable server get
// this server's IP blocked by Hostinger's firewall, and users wait 45s+ for an error
const CONNECT_COOLDOWN_MS = 30 * 1000;
let dbUnavailableUntil = 0;

const dbUnavailableError = () => {
  const error = new Error('Database temporarily unavailable');
  error.code = 'DB_UNAVAILABLE';
  return error;
};

const executeQuery = async (sql, params = [], retries = 2) => {
  if (!sql) return [];

  if (Date.now() < dbUnavailableUntil) throw dbUnavailableError();

  try {
    const [results] = await promisePool.query(sql, params);
    return results;
  } catch (error) {
    if (isConnectFailure(error)) {
      if (Date.now() >= dbUnavailableUntil) {
        console.error(`Database connect failed (${error.code}), pausing queries for ${CONNECT_COOLDOWN_MS / 1000}s`);
      }
      dbUnavailableUntil = Date.now() + CONNECT_COOLDOWN_MS;
      throw error;
    }

    if (retries > 0 && RETRYABLE_ERROR_CODES.has(error?.code)) {
      console.warn(`Query retry after ${error.code}`);
      await wait(300 * (3 - retries)); // short pause, longer on the second retry
      return executeQuery(sql, params, retries - 1);
    }

    console.error('Query Error:', error?.code, error?.message || error);
    throw error;
  }
};

const checkDatabaseConnection = async () => {
  const connection = await promisePool.getConnection();

  try {
    await connection.ping();
  } finally {
    connection.release();
  }
};

module.exports = {
  pool,
  executeQuery,
  checkDatabaseConnection,
};
