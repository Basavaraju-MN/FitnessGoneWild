// Role permissions: which role can open which admin screen. Set by an admin
// in Users & Roles → Role permissions and stored in role_permissions.
// Read on every request from a copy in memory (refreshed every minute and
// after a save), so checking access never waits for the database.
// The Admin role always has every screen, so nobody can lock themselves out.
// Before role_permissions.sql has run, the defaults in config.js are used.
const { executeQuery } = require('../../db/connection');
const { permissions: DEFAULTS } = require('../../config');
const { badRequest, logActivity } = require('../../utils/http');

const ROLES = ['admin', 'sales', 'operations'];
const EDITABLE_ROLES = ROLES.filter((role) => role !== 'admin');

// Every screen, in menu order, with the name and menu group shown in the admin
const SCREENS = [
  { module: 'dashboard', label: 'Dashboard', group: 'Overview' },
  { module: 'packages', label: 'Treks & Trips', group: 'Trip Management' },
  { module: 'coordination', label: 'Trip Coordination', group: 'Trip Management' },
  { module: 'pickup-points', label: 'Pickup Points', group: 'Trip Management' },
  { module: 'regions', label: 'Regions & Cities', group: 'Trip Management' },
  { module: 'guides', label: 'Guides', group: 'Trip Management' },
  { module: 'b2b', label: 'B2B Vendors', group: 'Trip Management' },
  { module: 'bookings', label: 'Bookings', group: 'Bookings & Revenue' },
  { module: 'payments', label: 'Payments & Refunds', group: 'Bookings & Revenue' },
  { module: 'coupons', label: 'Coupons', group: 'Bookings & Revenue' },
  { module: 'customers', label: 'Customers', group: 'Customer Management' },
  { module: 'enquiries', label: 'Enquiries & Leads', group: 'Customer Management' },
  { module: 'reviews', label: 'Reviews', group: 'Customer Management' },
  { module: 'brochures', label: 'Brochures', group: 'Marketing & Content' },
  { module: 'hero', label: 'Website Hero', group: 'Marketing & Content' },
  { module: 'about', label: 'About Page', group: 'Marketing & Content' },
  { module: 'reports', label: 'Reports & Exports', group: 'Reports & Analytics' },
  { module: 'activity', label: 'Activity Log', group: 'System Settings' },
  { module: 'users', label: 'Users & Roles', group: 'System Settings' },
  { module: 'settings', label: 'Settings', group: 'System Settings' },
].filter((screen) => DEFAULTS[screen.module]);

const MODULES = SCREENS.map((s) => s.module);

const queries = {
  list: 'SELECT role, module FROM role_permissions',
  clear: 'DELETE FROM role_permissions WHERE role IN (?)',
  add: 'INSERT INTO role_permissions (role, module) VALUES ?',
};

// module -> Set of roles
const fromDefaults = () => new Map(MODULES.map((m) => [m, new Set(DEFAULTS[m])]));
let grants = fromDefaults();
let loadedAt = 0;
let loading = null;

async function refresh() {
  try {
    const rows = await executeQuery(queries.list);
    if (rows.length === 0) {
      grants = fromDefaults(); // table not filled yet
    } else {
      const next = new Map(MODULES.map((m) => [m, new Set(['admin'])]));
      for (const { role, module } of rows) next.get(module)?.add(role);
      grants = next;
    }
  } catch (error) {
    if (!['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code)) {
      console.error('Role permissions could not be read:', error?.message || error);
    }
    // keep the last known (or default) permissions
  }
  loadedAt = Date.now();
}

/** Makes sure the permissions are loaded (cheap after the first call). */
function ensureLoaded() {
  if (Date.now() - loadedAt < 60 * 1000) return Promise.resolve();
  if (!loading) loading = refresh().finally(() => { loading = null; });
  return loading;
}

const rolesFor = (module) => [...(grants.get(module) || [])];

// Trek Leads never get admin screens: they have their own portal (trekLead)
const modulesForRole = (role) =>
  role === 'trek_lead' ? [] : role === 'admin' ? [...MODULES] : MODULES.filter((m) => grants.get(m)?.has(role));

/* ---------- Users & Roles → Role permissions ---------- */

async function getMatrix() {
  await refresh();
  return {
    roles: ROLES,
    editableRoles: EDITABLE_ROLES,
    screens: SCREENS,
    grants: Object.fromEntries(MODULES.map((m) => [m, rolesFor(m)])),
  };
}

// body.grants: { bookings: ['sales', 'operations'], … } (admin is always added)
async function saveMatrix(admin, body) {
  const wanted = body?.grants;
  if (!wanted || typeof wanted !== 'object') throw badRequest('Nothing to save');

  const rows = [];
  for (const module of MODULES) {
    const roles = Array.isArray(wanted[module]) ? wanted[module] : [];
    for (const role of roles) {
      if (!EDITABLE_ROLES.includes(role)) continue;
      rows.push([role, module]);
    }
  }

  // Replace the editable roles' rows; one admin row keeps the table "filled"
  await executeQuery(queries.clear, [ROLES]);
  await executeQuery(queries.add, [[['admin', 'users'], ...rows]]);
  await refresh();

  const summary = EDITABLE_ROLES.map((role) => `${role}: ${modulesForRole(role).join(', ') || 'none'}`).join(' | ');
  await logActivity(admin, 'update', 'role_permissions', null, summary);
  return getMatrix();
}

// Load once when the server starts
ensureLoaded();

module.exports = {
  ROLES,
  ensureLoaded,
  rolesFor,
  modulesForRole,
  getMatrix,
  saveMatrix,
};
