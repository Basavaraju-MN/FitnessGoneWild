const dbops = require('../db/dbops');

// An error with an HTTP status; the error handler (app.js) sends its
// message to the browser for 4xx, and a generic message for 5xx.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const badRequest = (message) => new HttpError(400, message);
const notFound = (message = 'Not found') => new HttpError(404, message);

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
async function logActivity(admin, action, entityType, entityId, detail) {
  try {
    await dbops.createActivity(
      admin?.id || null,
      action,
      entityType,
      entityId || null,
      detail ? String(detail).slice(0, 500) : null
    );
  } catch (error) {
    console.error('activity_log write failed:', error.message);
  }
}

module.exports = {
  HttpError,
  badRequest,
  notFound,
  pick,
  requireFields,
  toMoney,
  isDate,
  logActivity,
};
