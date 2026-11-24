// trips.featured_in_category: a featured trip is also listed in its category
// on the website (1), or only in Featured trips (0, as before). Added by the
// server itself once per start; same as sql/featured_in_category.sql.
const { executeQuery } = require('../../db/connection');

const SQL = {
  hasColumn: `
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'trips' AND COLUMN_NAME = 'featured_in_category'`,
  addColumn: 'ALTER TABLE trips ADD COLUMN featured_in_category TINYINT(1) NOT NULL DEFAULT 0 AFTER is_featured',
};

let ready = null;
function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      if (!(await executeQuery(SQL.hasColumn)).length) await executeQuery(SQL.addColumn);
    })().catch((error) => {
      ready = null; // try again next time
      throw error;
    });
  }
  return ready;
}

module.exports = { ensureSchema };
