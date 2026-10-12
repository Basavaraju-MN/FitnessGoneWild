// Creates (or resets) an admin login.
// Usage: pnpm --filter admin-server create-admin <username> <email> <password> ["Full Name"]
const bcrypt = require('bcryptjs');
const { pool, query, queryOne } = require('../db');

async function main() {
  const [username, email, password, fullName = 'Administrator'] = process.argv.slice(2);

  if (!username || !email || !password) {
    console.log('Usage: pnpm --filter admin-server create-admin <username> <email> <password> ["Full Name"]');
    process.exit(1);
  }

  if (password.length < 8) {
    console.log('Password must be at least 8 characters');
    process.exit(1);
  }

  const hash = await bcrypt.hash(password, 10);
  const existing = await queryOne('SELECT id FROM admin_users WHERE username = ? OR email = ?', [username, email]);

  if (existing) {
    await query(
      "UPDATE admin_users SET password_hash = ?, role = 'admin', is_active = 1 WHERE id = ?",
      [hash, existing.id]
    );
    console.log(`Updated "${username}": password reset, role admin, active.`);
  } else {
    await query(
      "INSERT INTO admin_users (username, full_name, email, password_hash, role, is_active) VALUES (?, ?, ?, ?, 'admin', 1)",
      [username, fullName, email.toLowerCase(), hash]
    );
    console.log(`Created admin "${username}".`);
  }

  await pool.end();
}

main().catch(async (error) => {
  console.error('Failed:', error.message);
  await pool.end();
  process.exit(1);
});
