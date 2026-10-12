const mysql = require('mysql2');
const { db } = require('./config');

const pool = mysql
  .createPool({
    ...db,
    waitForConnections: true,
    connectionLimit: 10,
    timezone: '+05:30',
    dateStrings: true,
    // Remote MySQL drops idle connections
    enableKeepAlive: true,
    keepAliveInitialDelay: 10000,
    maxIdle: 2,
    idleTimeout: 60000,
  })
  .promise();

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

module.exports = { pool, query, queryOne };
