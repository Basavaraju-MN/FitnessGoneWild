const { query, queryOne } = require('../db');
const { ok, pick, badRequest, notFound, logActivity } = require('../utils/http');

const FOLLOW_UP = ['not_contacted', 'contacted', 'interested', 'converted', 'not_interested'];

exports.list = async (req, res) => {
  const [rows, stats] = await Promise.all([
    query(`
      SELECT bd.id, bd.customer_id, bd.name, bd.phone, bd.email,
             bd.trip_id, t.name AS trip_name, bd.follow_up_status, bd.notes,
             bd.assigned_to, a.full_name AS assigned_name,
             bd.downloaded_at, bd.updated_at
      FROM brochure_downloads bd
      LEFT JOIN trips t ON t.id = bd.trip_id
      LEFT JOIN admin_users a ON a.id = bd.assigned_to
      ORDER BY bd.downloaded_at DESC
      LIMIT 5000`),
    queryOne(`
      SELECT COUNT(*) AS total,
             COALESCE(SUM(DATE(downloaded_at) = CURDATE()), 0) AS today,
             COUNT(DISTINCT phone) AS unique_leads,
             COALESCE(SUM(follow_up_status = 'not_contacted'), 0) AS not_contacted,
             COALESCE(SUM(follow_up_status = 'converted'), 0) AS converted
      FROM brochure_downloads`),
  ]);

  ok(res, rows, { stats });
};

exports.update = async (req, res) => {
  const data = pick(req.body, ['follow_up_status', 'notes', 'assigned_to']);
  if (data.follow_up_status !== undefined && !FOLLOW_UP.includes(data.follow_up_status)) {
    throw badRequest('Unknown follow-up status');
  }
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  const result = await query('UPDATE brochure_downloads SET ? WHERE id = ?', [data, req.params.id]);
  if (!result.affectedRows) throw notFound('Lead not found');

  await logActivity(req, 'update', 'brochure_download', req.params.id, Object.keys(data).join(', '));
  ok(res, { id: Number(req.params.id) });
};
