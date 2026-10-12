const { query } = require('../db');

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (message) => new HttpError(400, message);
const notFound = (message = 'Not found') => new HttpError(404, message);

// Express 5 forwards rejected promises to the error handler,
// so handlers can simply be async.
const ok = (res, data, extra = {}) => res.json({ success: true, data, ...extra });

// Keep only the allowed keys; empty strings become null
function pick(body = {}, keys) {
  const out = {};
  for (const key of keys) {
    if (body[key] === undefined) continue;
    out[key] = body[key] === '' ? null : body[key];
  }
  return out;
}

function requireFields(body, fields) {
  const missing = fields.filter(
    (field) => body[field] === undefined || body[field] === null || body[field] === ''
  );
  if (missing.length) {
    throw badRequest(`Required: ${missing.join(', ')}`);
  }
}

const toMoney = (value) => Math.round((Number(value) || 0) * 100) / 100;

const isDate = (value) => /^\d{4}-\d{2}-\d{2}$/.test(String(value || ''));

// Writes to activity_log; never fails the request
async function logActivity(req, action, entityType, entityId, detail) {
  try {
    await query(
      'INSERT INTO activity_log (admin_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?)',
      [req.admin?.id || null, action, entityType, entityId || null, detail ? String(detail).slice(0, 500) : null]
    );
  } catch (error) {
    console.error('activity_log write failed:', error.message);
  }
}

module.exports = {
  HttpError,
  badRequest,
  notFound,
  ok,
  pick,
  requireFields,
  toMoney,
  isDate,
  logActivity,
};
