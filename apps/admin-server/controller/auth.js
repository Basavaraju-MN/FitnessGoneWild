const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const {
  jwtSecret,
  cookieName,
  sessionHours,
  isProduction,
} = require('../config');
const { query, queryOne } = require('../db');
const { modulesForRole } = require('../middleware/auth');
const { HttpError, ok, requireFields, logActivity } = require('../utils/http');

// The admin is served from the same site as its API (thefitnessgonewild.in/admin
// and /api/admin; localhost ports locally), so a Lax cookie works everywhere.
const cookieOptions = {
  httpOnly: true,
  secure: isProduction,
  sameSite: 'lax',
  path: '/',
  maxAge: sessionHours * 60 * 60 * 1000,
};

const publicUser = (admin) => ({
  id: admin.id,
  username: admin.username,
  fullName: admin.full_name,
  email: admin.email,
  role: admin.role,
  modules: modulesForRole(admin.role),
});

exports.login = async (req, res) => {
  requireFields(req.body, ['username', 'password']);
  const login = String(req.body.username).trim();

  const admin = await queryOne(
    'SELECT * FROM admin_users WHERE username = ? OR email = ? LIMIT 1',
    [login, login]
  );

  const valid =
    admin && admin.is_active &&
    (await bcrypt.compare(String(req.body.password), admin.password_hash));

  if (!valid) {
    throw new HttpError(401, 'Wrong username or password');
  }

  const token = jwt.sign({ id: admin.id }, jwtSecret, {
    expiresIn: `${sessionHours}h`,
  });

  await query('UPDATE admin_users SET last_login_at = NOW() WHERE id = ?', [admin.id]);
  req.admin = admin;
  await logActivity(req, 'login', 'admin_user', admin.id, `${admin.username} logged in`);

  res.cookie(cookieName, token, cookieOptions);
  ok(res, publicUser(admin));
};

exports.logout = async (req, res) => {
  res.clearCookie(cookieName, { ...cookieOptions, maxAge: undefined });
  ok(res, true);
};

exports.me = async (req, res) => {
  ok(res, publicUser(req.admin));
};

exports.changePassword = async (req, res) => {
  requireFields(req.body, ['currentPassword', 'newPassword']);

  if (String(req.body.newPassword).length < 8) {
    throw new HttpError(400, 'New password must be at least 8 characters');
  }

  const admin = await queryOne('SELECT password_hash FROM admin_users WHERE id = ?', [req.admin.id]);
  const valid = await bcrypt.compare(String(req.body.currentPassword), admin.password_hash);
  if (!valid) throw new HttpError(400, 'Current password is wrong');

  const hash = await bcrypt.hash(String(req.body.newPassword), 10);
  await query('UPDATE admin_users SET password_hash = ? WHERE id = ?', [hash, req.admin.id]);
  await logActivity(req, 'change_password', 'admin_user', req.admin.id);
  ok(res, true);
};
