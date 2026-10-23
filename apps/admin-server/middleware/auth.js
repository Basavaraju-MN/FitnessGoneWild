const { cookieName } = require('../config');
const permissionManager = require('../components/permission/permissionManager');
const authManager = require('../components/auth/authManager');
const { HttpError } = require('../utils/http');

// Loads the logged-in admin from the session cookie into req.admin
async function requireAuth(req, res, next) {
  const token = req.cookies?.[cookieName];
  if (!token) return next(new HttpError(401, 'Please log in'));

  try {
    // Who may open what (kept in memory, re-read every minute)
    await permissionManager.ensureLoaded();

    // Re-checks the user, so deactivated accounts lose access straight away
    const admin = await authManager.getAdminFromToken(token);
    if (!admin) return next(new HttpError(401, 'Session expired, please log in again'));

    req.admin = admin;
    return next();
  } catch (error) {
    return next(error);
  }
}

// Allows the request only for roles that may open the module
const requireModule = (module) => (req, res, next) => {
  const roles = permissionManager.rolesFor(module);
  if (!roles.includes(req.admin?.role)) {
    return next(new HttpError(403, 'You do not have access to this section'));
  }
  return next();
};

module.exports = { requireAuth, requireModule };
