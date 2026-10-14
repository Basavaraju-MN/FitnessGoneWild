// Login, session check and change password.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const { jwtSecret, sessionHours } = require('../../config');
const dbops = require('../../db/dbops');
const {
  HttpError,
  badRequest,
  requireFields,
  logActivity,
} = require('../../utils/http');
const {
  modulesForRole,
} = require('../common/rules');

// What the browser is told about the logged-in admin
const publicUser = (admin) => ({
  id: admin.id,
  username: admin.username,
  fullName: admin.full_name,
  email: admin.email,
  role: admin.role,
  modules: modulesForRole(admin.role),
});

// Returns { user, token } or throws 401
async function login(username, password) {
  requireFields({ username, password }, ['username', 'password']);

  const admin = await dbops.getAdminByLogin(String(username).trim());
  const valid =
    admin && admin.is_active &&
    (await bcrypt.compare(String(password), admin.password_hash));

  if (!valid) throw new HttpError(401, 'Wrong username or password');

  const token = jwt.sign({ id: admin.id }, jwtSecret, { expiresIn: `${sessionHours}h` });

  await dbops.updateAdminLastLogin(admin.id);
  await logActivity(admin, 'login', 'admin_user', admin.id, `${admin.username} logged in`);

  return { user: publicUser(admin), token };
}

// Admin for a session token, or null when the token is invalid / user inactive
async function getAdminFromToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    return null;
  }

  const admin = await dbops.getAdminById(payload.id);
  return admin && admin.is_active ? admin : null;
}

async function changePassword(admin, { currentPassword, newPassword }) {
  requireFields({ currentPassword, newPassword }, ['currentPassword', 'newPassword']);
  if (String(newPassword).length < 8) throw badRequest('New password must be at least 8 characters');

  const hash = await dbops.getAdminPasswordHash(admin.id);
  if (!(await bcrypt.compare(String(currentPassword), hash))) {
    throw badRequest('Current password is wrong');
  }

  await dbops.updateAdminPassword(admin.id, await bcrypt.hash(String(newPassword), 10));
  await logActivity(admin, 'change_password', 'admin_user', admin.id);
}

module.exports = {
  publicUser,
  login,
  getAdminFromToken,
  changePassword,
};
