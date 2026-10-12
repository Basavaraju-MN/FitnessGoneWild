const { query, queryOne } = require('../db');
const { ok } = require('../utils/http');

const detail = (key) => `JSON_UNQUOTE(JSON_EXTRACT(pt.booking_details, '$.${key}'))`;

// PhonePe transactions (online) and payments recorded in the admin (offline)
exports.list = async (req, res) => {
  const [online, offline, stats] = await Promise.all([
    query(`
      SELECT pt.id, pt.merchant_order_id, pt.transaction_id, pt.payment_method,
             pt.amount / 100 AS amount, pt.status, pt.phonepe_state,
             pt.created_at, pt.updated_at,
             b.id AS booking_id, b.booking_ref,
             COALESCE(c.name, ${detail('customerName')}) AS customer_name,
             COALESCE(c.phone, ${detail('customerPhone')}) AS customer_phone,
             ${detail('trekName')} AS trip_name,
             ${detail('paymentType')} AS payment_type
      FROM phonepe_transactions pt
      LEFT JOIN bookings b ON b.merchant_order_id = pt.merchant_order_id
      LEFT JOIN customers c ON c.id = b.customer_id
      ORDER BY pt.created_at DESC
      LIMIT 5000`),
    query(`
      SELECT bp.id, bp.amount, bp.method, bp.reference, bp.note, bp.paid_at,
             b.id AS booking_id, b.booking_ref, c.name AS customer_name,
             t.name AS trip_name, a.full_name AS received_by_name
      FROM booking_payments bp
      JOIN bookings b ON b.id = bp.booking_id
      LEFT JOIN customers c ON c.id = b.customer_id
      LEFT JOIN trips t ON t.id = b.trip_id
      LEFT JOIN admin_users a ON a.id = bp.received_by
      ORDER BY bp.paid_at DESC
      LIMIT 5000`),
    queryOne(`
      SELECT COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount END), 0) / 100 AS success_amount,
             COALESCE(SUM(status = 'SUCCESS'), 0) AS success_count,
             COALESCE(SUM(CASE WHEN status IN ('PROCESSING','PENDING') THEN amount END), 0) / 100 AS pending_amount,
             COALESCE(SUM(status IN ('PROCESSING','PENDING')), 0) AS pending_count,
             COALESCE(SUM(CASE WHEN status IN ('FAILED','CANCELLED') THEN amount END), 0) / 100 AS failed_amount,
             COALESCE(SUM(status IN ('FAILED','CANCELLED')), 0) AS failed_count
      FROM phonepe_transactions`),
  ]);

  const offlineTotal = offline.reduce((sum, row) => sum + Number(row.amount || 0), 0);

  ok(res, { online, offline }, { stats: { ...stats, offline_amount: offlineTotal, offline_count: offline.length } });
};
