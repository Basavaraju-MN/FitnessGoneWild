const sqlqueries = {
  getTrekCategories: `SELECT * FROM categories`,
  getTrekDetails: `
    SELECT
      t.id,
      t.slug,
      t.name,
      t.category_id,
      t.blurb,
      t.description,
      t.itinerary,
      t.duration_label,
      t.duration_days,
      t.difficulty,
      t.distance_label,
      t.price,
      t.without_transport_price,
      t.with_transport_price,
      t.price_note,
      t.image_path,
      t.badge_text,
      t.badge_style,
      t.is_featured,
      t.featured_label,
      t.featured_order,
      t.status,
      t.created_at,
      t.updated_at,
      GROUP_CONCAT(DISTINCT ie.inclusion ORDER BY ie.id SEPARATOR '||') AS includes,
      GROUP_CONCAT(DISTINCT ie.exclusion ORDER BY ie.id SEPARATOR '||') AS exclusions
    FROM trips t
    LEFT JOIN inclusion_exclusion ie ON ie.trip_id = t.id
    WHERE t.category_id = ?
    GROUP BY t.id
    ORDER BY t.id ASC
  `,
  getFeaturedTrips: `
    SELECT
      t.id,
      t.slug,
      t.name,
      t.category_id,
      t.blurb,
      t.description,
      t.itinerary,
      t.duration_label,
      t.duration_days,
      t.difficulty,
      t.distance_label,
      t.price,
      t.without_transport_price,
      t.with_transport_price,
      t.price_note,
      t.image_path,
      t.badge_text,
      t.badge_style,
      t.is_featured,
      t.featured_label,
      t.featured_order,
      t.status,
      t.created_at,
      t.updated_at,
      GROUP_CONCAT(DISTINCT ie.inclusion ORDER BY ie.id SEPARATOR '||') AS includes,
      GROUP_CONCAT(DISTINCT ie.exclusion ORDER BY ie.id SEPARATOR '||') AS exclusions,
      COALESCE(SUM(CASE WHEN ti.type = 'interested' THEN 1 ELSE 0 END), 0) AS interested_count,
      COALESCE(SUM(CASE WHEN ti.type = 'enquiry' THEN 1 ELSE 0 END), 0) AS enquiry_count
    FROM trips t
    LEFT JOIN inclusion_exclusion ie ON ie.trip_id = t.id
    LEFT JOIN trip_interests ti ON ti.trip_id = t.id
    WHERE t.is_featured = 1
    GROUP BY t.id
    ORDER BY t.featured_order ASC, t.id ASC
  `,
  getReviews: `SELECT id, trip_id, customer_id, booking_id, author_name, rating, body, trip_month, avatar_colour, status, moderated_by, created_at, published_at FROM reviews WHERE 1 ORDER BY published_at DESC, created_at DESC`,
  getWhyUs: `SELECT id, title, description, created_at, updated_at FROM why_us WHERE 1 ORDER BY id ASC`,
  getFaq: `SELECT id, question, answer, created_at, updated_at FROM faq WHERE 1 ORDER BY id ASC`,
  createTripInterest: `INSERT INTO trip_interests (trip_id, type, source, created_at) VALUES (?, ?, ?, NOW())`,
  createCustomer: `INSERT INTO customers (name, phone, email, city, created_at) VALUES (?, ?, ?, ?, NOW())`,
  downloadBroucher: ` SELECT id, trip_id, file_name, file_data, file_size, mime_type FROM brochures WHERE trip_id = ?`,
  updateDownloadCount: `UPDATE brochures SET download_count = download_count + 1 WHERE trip_id = ?`,
  phonepeSql : {
    createTransaction: `INSERT INTO phonepe_transactions (merchant_order_id, user_id, amount, currency, status, redirect_url) VALUES (?, ?, ?, ?, 'PROCESSING', ?)`,
    getTransactionByOrderId: `SELECT * FROM phonepe_transactions WHERE merchant_order_id = ? LIMIT 1`,
    updateTransactionStatus: `UPDATE phonepe_transactions SET status = ?, phonepe_state = ?, response_code = ?, response_message = ?, phonepe_order_id = ?, transaction_id = ?, provider_reference_id = ?, payment_method = ?, payment_timestamp = ?, updated_at = NOW() WHERE merchant_order_id = ?`,
    insertWebhookLog: `INSERT INTO phonepe_webhook_logs (merchant_order_id, event_type, authorization, request_body, payment_status, signature_valid, processing_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    updateWebhookLog: `UPDATE phonepe_webhook_logs SET processing_status = ?, error_message = ?, processed_at = NOW() WHERE id = ?`,
    getWebhookLogById: `SELECT * FROM phonepe_webhook_logs WHERE id = ? LIMIT 1`,
}
};

(module.exports = sqlqueries);