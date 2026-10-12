// The admin uses the website's own connection pool (apps/server/src/db/connection.js):
// one pool to the database instead of two, and its retries when the
// database drops a connection or is briefly at its connection limit.
const { pool, executeQuery } = require('../server/src/db/connection');

async function query(sql, params = []) {
  return executeQuery(sql, params);
}

async function queryOne(sql, params = []) {
  const rows = await query(sql, params);
  return rows[0] || null;
}

// Close the pool (used by scripts that should exit when done)
const end = () => pool.promise().end();

module.exports = { query, queryOne, end };
