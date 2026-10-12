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
  // The remote MySQL drops idle connections; keep them alive and
  // recycle idle ones before the server closes them.
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  maxIdle: 2,
  idleTimeout: 60000,
  connectTimeout: 15000,
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
  'ER_USER_LIMIT_REACHED',
]);

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const executeQuery = async (sql, params = [], retries = 2) => {
  if (!sql) return [];

  try {
    const [results] = await promisePool.query(sql, params);
    return results;
  } catch (error) {
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
