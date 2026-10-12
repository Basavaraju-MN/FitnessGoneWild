const jwt = require('jsonwebtoken');

const { jwtSecret, cookieName, permissions } = require('../config');
const { queryOne } = require('../db');
const { HttpError } = require('../utils/http');

// Loads the logged-in admin from the session cookie
async function requireAuth(req, res, next) {
  const token = req.cookies?.[cookieName];
  if (!token) return next(new HttpError(401, 'Please log in'));

  let payload;
  try {
    payload = jwt.verify(token, jwtSecret);
  } catch {
    return next(new HttpError(401, 'Session expired, please log in again'));
  }

  // Re-check the user so deactivated accounts lose access straight away
  const admin = await queryOne(
    'SELECT id, username, full_name, email, role, is_active FROM admin_users WHERE id = ?',
    [payload.id]
  );

  if (!admin || !admin.is_active) {
    return next(new HttpError(401, 'Account is not active'));
  }

  req.admin = admin;
  next();
}

// Allows the request only for roles that may open the module
const requireModule = (module) => (req, res, next) => {
  const roles = permissions[module] || [];
  if (!roles.includes(req.admin?.role)) {
    return next(new HttpError(403, 'You do not have access to this section'));
  }
  next();
};

const modulesForRole = (role) =>
  Object.keys(permissions).filter((module) => permissions[module].includes(role));

module.exports = { requireAuth, requireModule, modulesForRole };
