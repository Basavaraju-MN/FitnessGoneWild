// Users & Roles screen.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const bcrypt = require('bcryptjs');

const dbops = require('../../db/dbops');
const {
  badRequest,
  notFound,
  pick,
  requireFields,
  logActivity,
} = require('../../utils/http');
const {
  ROLES,
  checkPassword,
} = require('../common/rules');

const getUsers = () => dbops.getAdminUsers();

async function createUser(admin, body) {
  requireFields(body, ['username', 'full_name', 'email', 'role', 'password']);
  if (!ROLES.includes(body.role)) throw badRequest('Unknown role');
  checkPassword(body.password);

  try {
    const id = await dbops.createAdminUser({
      username: String(body.username).trim(),
      full_name: String(body.full_name).trim(),
      email: String(body.email).trim().toLowerCase(),
      role: body.role,
      password_hash: await bcrypt.hash(String(body.password), 10),
      is_active: 1,
    });
    await logActivity(admin, 'create', 'admin_user', id, body.username);
    return { id };
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw badRequest('Username or email is already used');
    throw error;
  }
}

async function updateUser(admin, id, body) {
  const data = pick(body, ['full_name', 'email', 'role', 'is_active']);

  if (data.role !== undefined && !ROLES.includes(data.role)) throw badRequest('Unknown role');
  if (data.is_active !== undefined) data.is_active = data.is_active ? 1 : 0;

  // An admin cannot lock themselves out
  if (id === admin.id && (data.is_active === 0 || (data.role && data.role !== 'admin'))) {
    throw badRequest('You cannot deactivate or demote your own account');
  }
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  try {
    if (!(await dbops.updateAdminUser(id, data))) throw notFound('User not found');
  } catch (error) {
    if (error?.code === 'ER_DUP_ENTRY') throw badRequest('Email is already used');
    throw error;
  }

  await logActivity(admin, 'update', 'admin_user', id, Object.keys(data).join(', '));
  return { id };
}

async function resetUserPassword(admin, id, { password }) {
  checkPassword(password);
  const user = await dbops.getAdminUserBasic(id);
  if (!user) throw notFound('User not found');

  await dbops.updateAdminPassword(user.id, await bcrypt.hash(String(password), 10));
  await logActivity(admin, 'reset_password', 'admin_user', user.id, user.username);
  return { id: user.id };
}

module.exports = {
  getUsers,
  createUser,
  updateUser,
  resetUserPassword,
};
