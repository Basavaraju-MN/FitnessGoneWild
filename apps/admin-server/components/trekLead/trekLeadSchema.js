// Guide login (Trek Lead portal) database setup, done by the server itself
// once per start (same as sql/trek_leads.sql, which can also be run by hand):
//   admin_users.role        gets the value 'trek_lead' (a guide's login)
//   guides.admin_user_id    the guide's login account, if they have one
//   departure_guides        the guides of each trip (departure = one trek on
//                           given dates); a trip can have several guides.
//                           departures.guide_id stays = the first of them,
//                           so older screens and reports keep working.
//   trip_expenses           what a guide spent on a trip (with a bill photo)
const { executeQuery } = require('../../db/connection');

const SQL = {
  roleColumn: `
    SELECT COLUMN_TYPE AS type, COLUMN_DEFAULT AS dflt FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'admin_users' AND COLUMN_NAME = 'role'`,
  hasColumn: `
    SELECT 1 FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
  hasTable: `
    SELECT 1 FROM information_schema.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
  guideLogin: 'ALTER TABLE guides ADD COLUMN admin_user_id INT NULL, ADD UNIQUE KEY uq_guides_admin_user (admin_user_id)',
  tripGuides: `
    CREATE TABLE IF NOT EXISTS departure_guides (
      departure_id INT NOT NULL,
      guide_id INT NOT NULL,
      assigned_by INT NULL,
      assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (departure_id, guide_id),
      KEY idx_departure_guides_guide (guide_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  // Money a guide spent on a trip (fuel, food, permits…), reviewed by the office
  tripExpenses: `
    CREATE TABLE IF NOT EXISTS trip_expenses (
      id INT NOT NULL AUTO_INCREMENT,
      departure_id INT NOT NULL,
      category VARCHAR(40) NOT NULL,
      description VARCHAR(300) NULL,
      amount DECIMAL(10,2) NOT NULL,
      paid_by VARCHAR(20) NOT NULL DEFAULT 'cash',
      spent_on DATE NOT NULL,
      receipt_mime VARCHAR(40) NULL,
      receipt MEDIUMBLOB NULL,
      status VARCHAR(12) NOT NULL DEFAULT 'submitted',
      review_note VARCHAR(300) NULL,
      reviewed_by INT NULL,
      reviewed_at DATETIME NULL,
      created_by INT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_trip_expenses_departure (departure_id),
      KEY idx_trip_expenses_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  // First time only: the guide already chosen on each trip
  copyGuides: `
    INSERT IGNORE INTO departure_guides (departure_id, guide_id)
    SELECT id, guide_id FROM departures WHERE guide_id IS NOT NULL`,
};

// role is an ENUM: add 'trek_lead' and keep every value it already has
async function addRoleValue() {
  const [column] = await executeQuery(SQL.roleColumn);
  const type = String(column?.type || '');
  if (!/^enum\(/i.test(type) || type.includes("'trek_lead'")) return;

  const values = [...type.matchAll(/'((?:[^']|'')*)'/g)].map((m) => m[1]);
  const list = [...values, 'trek_lead'].map((v) => `'${v}'`).join(',');
  const dflt = values.includes(column.dflt) ? column.dflt : values[0];
  await executeQuery(`ALTER TABLE admin_users MODIFY role ENUM(${list}) NOT NULL DEFAULT '${dflt}'`);
}

let ready = null;
function ensureSchema() {
  if (!ready) {
    ready = (async () => {
      await addRoleValue();
      if (!(await executeQuery(SQL.hasColumn, ['guides', 'admin_user_id'])).length) {
        await executeQuery(SQL.guideLogin);
      }
      const isNew = !(await executeQuery(SQL.hasTable, ['departure_guides'])).length;
      await executeQuery(SQL.tripGuides);
      if (isNew) await executeQuery(SQL.copyGuides);
      await executeQuery(SQL.tripExpenses);
    })().catch((error) => {
      ready = null; // try again next time
      throw error;
    });
  }
  return ready;
}

module.exports = { ensureSchema };
