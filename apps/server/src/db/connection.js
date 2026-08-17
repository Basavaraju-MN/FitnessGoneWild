const mysql = require('mysql2');
require('dotenv').config();

const { db } = require('../config/config');

const pool = mysql.createPool({
  host: db.host,
  user: db.user,
  password: db.password,
  database: db.database,
  waitForConnections: true,
  connectionLimit: db.connectionLimit,
  queueLimit: 0,
  timezone: '+05:30',
  dateStrings: true
});

const promisePool = pool.promise();

const executeQuery = async (sql, params = []) => {
  console.log('Executing SQL Query:', sql);

  if (!sql) return [];

  try {
    const [results] = await promisePool.query(sql, params);
    return results;
  } catch (err) {
    console.error('Query Error:', err?.message || err);
    throw err;
  }
};

module.exports = {
  pool,
  executeQuery
};