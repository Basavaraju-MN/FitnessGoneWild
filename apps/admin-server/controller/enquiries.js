const { query } = require('../db');
const {
  ok,
  pick,
  requireFields,
  badRequest,
  notFound,
  logActivity,
} = require('../utils/http');

const STATUSES = ['new', 'contacted', 'interested', 'booked', 'closed'];
const SOURCES = ['website', 'whatsapp', 'phone', 'instagram', 'walkin'];

exports.list = async (req, res) => {
  ok(res, await query(`
    SELECT e.id, e.name, e.phone, e.email, e.trip_id, t.name AS trip_name,
           e.people, e.note, e.status, e.source, e.assigned_to,
           a.full_name AS assigned_name, e.received_at, e.updated_at
    FROM enquiries e
    LEFT JOIN trips t ON t.id = e.trip_id
    LEFT JOIN admin_users a ON a.id = e.assigned_to
    ORDER BY e.received_at DESC
    LIMIT 5000`));
};

exports.create = async (req, res) => {
  requireFields(req.body, ['name', 'phone']);
  const data = pick(req.body, ['name', 'phone', 'email', 'trip_id', 'people', 'note', 'source', 'assigned_to']);

  if (data.source && !SOURCES.includes(data.source)) throw badRequest('Unknown source');

  const result = await query('INSERT INTO enquiries SET ?', [{ status: 'new', ...data }]);
  await logActivity(req, 'create', 'enquiry', result.insertId, data.name);
  ok(res, { id: result.insertId });
};

exports.update = async (req, res) => {
  const data = pick(req.body, ['status', 'assigned_to', 'note', 'trip_id', 'people', 'email']);
  if (data.status !== undefined && !STATUSES.includes(data.status)) throw badRequest('Unknown status');
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  const result = await query('UPDATE enquiries SET ? WHERE id = ?', [data, req.params.id]);
  if (!result.affectedRows) throw notFound('Enquiry not found');

  await logActivity(req, 'update', 'enquiry', req.params.id, Object.keys(data).join(', '));
  ok(res, { id: Number(req.params.id) });
};
