const bcrypt = require('bcryptjs');

const { query, queryOne } = require('../db');
const {
  ok,
  pick,
  requireFields,
  badRequest,
  notFound,
  logActivity,
} = require('../utils/http');

const ROLES = ['admin', 'sales', 'operations'];

function checkPassword(password) {
  if (String(password || '').length < 8) {
    throw badRequest('Password must be at least 8 characters');
  }
}

exports.list = async (req, res) => {
  ok(res, await query(`
    SELECT id, username, full_name, email, role, is_active, last_login_at, created_at
    FROM admin_users ORDER BY is_active DESC, full_name`));
};

exports.create = async (req, res) => {
  requireFields(req.body, ['username', 'full_name', 'email', 'role', 'password']);
  if (!ROLES.includes(req.body.role)) throw badRequest('Unknown role');
  checkPassword(req.body.password);

  try {
    const result = await query('INSERT INTO admin_users SET ?', [{
      username: String(req.body.username).trim(),
      full_name: String(req.body.full_name).trim(),
      email: String(req.body.email).trim().toLowerCase(),
      role: req.body.role,
      password_hash: await bcrypt.hash(String(req.body.password), 10),
      is_active: 1,
    }]);
    await logActivity(req, 'create', 'admin_user', result.insertId, req.body.username);
    ok(res, { id: result.insertId });
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw badRequest('Username or email is already used');
    throw error;
  }
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const data = pick(req.body, ['full_name', 'email', 'role', 'is_active']);

  if (data.role !== undefined && !ROLES.includes(data.role)) throw badRequest('Unknown role');
  if (data.is_active !== undefined) data.is_active = data.is_active ? 1 : 0;

  // An admin cannot lock themselves out
  if (id === req.admin.id && (data.is_active === 0 || (data.role && data.role !== 'admin'))) {
    throw badRequest('You cannot deactivate or demote your own account');
  }
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  try {
    const result = await query('UPDATE admin_users SET ? WHERE id = ?', [data, id]);
    if (!result.affectedRows) throw notFound('User not found');
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw badRequest('Email is already used');
    throw error;
  }

  await logActivity(req, 'update', 'admin_user', id, Object.keys(data).join(', '));
  ok(res, { id });
};

exports.resetPassword = async (req, res) => {
  checkPassword(req.body.password);
  const user = await queryOne('SELECT id, username FROM admin_users WHERE id = ?', [req.params.id]);
  if (!user) throw notFound('User not found');

  await query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [
    await bcrypt.hash(String(req.body.password), 10),
    user.id,
  ]);
  await logActivity(req, 'reset_password', 'admin_user', user.id, user.username);
  ok(res, { id: user.id });
};
