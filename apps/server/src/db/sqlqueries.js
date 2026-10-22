const sqlqueries = {
  // Only active categories, in the order set by sort_order
  getTrekCategories: `SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
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
      AND COALESCE(t.is_featured, 0) = 0
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
  getReviews: `SELECT id, source, trip_id, customer_id, booking_id, author_name, author_photo_url, rating, body, owner_reply, trip_month, avatar_colour, status, moderated_by, created_at, published_at FROM reviews WHERE status = 'published' AND body <> '' ORDER BY published_at DESC, created_at DESC`,
  // Home page hero (edited in the admin)
  getHeroSettings: `SELECT slide_seconds FROM site_hero WHERE id = 1`,
  getHeroSlides: `SELECT id, image_path, eyebrow, headline_line1, headline_line2, message, primary_label, primary_target, secondary_label, secondary_target, facts FROM hero_slides WHERE is_active = 1 ORDER BY sort_order, id`,
  getWhyUs: `SELECT id, title, description, created_at, updated_at FROM why_us WHERE 1 ORDER BY id ASC`,
  getFaq: `SELECT id, question, answer, created_at, updated_at FROM faq WHERE 1 ORDER BY id ASC`,
  // Regions and departure cities (website "Departing from" picker and region filter)
  getRegions: `SELECT id, slug, name, tagline, image_path, sort_order FROM regions WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
  // Optional: which category tabs each region shows
  getRegionCategories: 'SELECT region_id, category_id FROM region_categories ORDER BY region_id, sort_order, category_id',
  getDepartureCities: `SELECT id, name, state, sort_order FROM departure_cities WHERE is_active = 1 ORDER BY sort_order ASC, id ASC`,
  // Each trek's region, and the cities it leaves from (cities of its active pickup points)
  getTripPlaces: `
    SELECT
      t.id AS trip_id,
      t.category_id,
      t.is_featured,
      r.id AS region_id,
      r.slug AS region_slug,
      r.name AS region_name,
      (
        SELECT GROUP_CONCAT(DISTINCT CONCAT(dc.id, ':', dc.name) ORDER BY dc.sort_order, dc.id SEPARATOR '|')
        FROM pickup_points pp
        JOIN departure_cities dc ON dc.id = pp.city_id AND dc.is_active = 1
        WHERE pp.trip_id = t.id AND pp.is_active = 1
      ) AS cities
    FROM trips t
    LEFT JOIN regions r ON r.id = t.region_id AND r.is_active = 1
  `,
  getPickupCities: `SELECT pp.id, dc.id AS city_id, dc.name AS city_name FROM pickup_points pp LEFT JOIN departure_cities dc ON dc.id = pp.city_id WHERE pp.trip_id = ?`,
  getPickupPoints: `SELECT id, trip_id, name, address, map_url, sort_order FROM pickup_points WHERE is_active = 1 AND trip_id = ? ORDER BY sort_order ASC, id ASC`,
  createTripInterest: `INSERT INTO trip_interests (trip_id, type, source, created_at) VALUES (?, ?, ?, NOW())`,
  createCustomer: `INSERT INTO customers (name, phone, email, city, trip_id, created_at) VALUES (?, ?, ?, ?, ?, NOW())`,
  downloadBroucher: ` SELECT id, trip_id, file_name, file_data, file_size, mime_type FROM brochures WHERE trip_id = ?`,
  updateDownloadCount: `UPDATE brochures SET download_count = download_count + 1 WHERE trip_id = ?`,
  // Brochure download = a lead in Enquiries & Leads (admin portal)
  createBrochureLead: `INSERT INTO enquiries (customer_id, trip_id, name, phone, email, people, status, source) VALUES (?, ?, ?, ?, ?, 1, 'new', 'brochure')`,
  // Someone who already booked before: link the lead to them
  findCustomerIdByPhone: `SELECT id FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1`,
  countTripInterested: `SELECT COUNT(*) AS total FROM trip_interests WHERE trip_id = ? AND type = 'interested'`,
  getTripById: `SELECT id, slug, name FROM trips WHERE id = ? LIMIT 1`,
  // Counts a download; creates the brochures row for file-only brochures
  countBrochureDownload: `INSERT INTO brochures (trip_id, file_name, file_size, mime_type, download_count) VALUES (?, ?, 0, 'application/pdf', 1) ON DUPLICATE KEY UPDATE download_count = download_count + 1`,
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