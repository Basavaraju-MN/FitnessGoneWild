const mysql = require('mysql2');
const { db } = require('../config/config');

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
});

const promisePool = pool.promise();

const executeQuery = async (sql, params = []) => {
  if (!sql) return [];

  try {
    const [results] = await promisePool.query(sql, params);
    return results;
  } catch (error) {
    console.error('Query Error:', error?.message || error);
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
