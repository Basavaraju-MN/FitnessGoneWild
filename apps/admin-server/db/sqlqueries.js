// All SQL used by the admin API, grouped by section.
// dbops.js runs these; nothing else writes SQL.

// Bookings that count as real business (not pending / cancelled)
const ACTIVE = "b.status IN ('confirmed','completed')";
// A customer = someone with a confirmed booking who paid (advance or full).
// Everyone else is still a lead in Enquiries.
const PAID = `${ACTIVE} AND b.amount_paid > 0`;

// Every rupee received on active bookings, with the date it came in:
// payments recorded in the admin + the online payment made at booking
const MONEY_IN = `
  SELECT bp.amount, bp.paid_at AS at
    FROM booking_payments bp JOIN bookings b ON b.id = bp.booking_id
   WHERE ${ACTIVE}
  UNION ALL
  SELECT b.amount_paid - COALESCE((SELECT SUM(x.amount) FROM booking_payments x WHERE x.booking_id = b.id), 0),
         COALESCE(b.paid_at, b.booked_at)
    FROM bookings b
   WHERE ${ACTIVE}
  UNION ALL
  SELECT -r.amount, COALESCE(r.completed_at, r.created_at)
    FROM booking_refunds r JOIN bookings b ON b.id = r.booking_id
   WHERE r.state = 'completed' AND ${ACTIVE}`;

const sqlqueries = {
  /* ================= AUTH & USERS ================= */
  getAdminById: 'SELECT id, username, full_name, email, role, is_active FROM admin_users WHERE id = ?',
  getAdminByLogin: 'SELECT * FROM admin_users WHERE username = ? OR email = ? LIMIT 1',
  getAdminPasswordHash: 'SELECT password_hash FROM admin_users WHERE id = ?',
  updateAdminLastLogin: 'UPDATE admin_users SET last_login_at = NOW() WHERE id = ?',
  updateAdminPassword: 'UPDATE admin_users SET password_hash = ? WHERE id = ?',
  getAdminUsers: `
    SELECT id, username, full_name, email, role, is_active, last_login_at, created_at
    FROM admin_users ORDER BY is_active DESC, full_name`,
  getAdminUserBasic: 'SELECT id, username FROM admin_users WHERE id = ?',
  createAdminUser: 'INSERT INTO admin_users SET ?',
  updateAdminUser: 'UPDATE admin_users SET ? WHERE id = ?',

  /* ================= ACTIVITY LOG ================= */
  createActivity: 'INSERT INTO activity_log (admin_id, action, entity_type, entity_id, detail) VALUES (?, ?, ?, ?, ?)',

  /* ================= DASHBOARD ================= */
  dashboardBookingTotals: `
    SELECT COUNT(*) AS bookings,
           COALESCE(SUM(b.people), 0) AS people,
           COALESCE(SUM(b.amount_paid), 0) AS collected,
           COALESCE(SUM(b.balance_amount), 0) AS pending,
           COALESCE(SUM(b.balance_amount > 0), 0) AS pendingBookings,
           COALESCE(SUM(CASE WHEN b.booked_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END), 0) AS bookingsThisMonth,
           COALESCE(SUM(DATE(b.booked_at) = CURDATE()), 0) AS bookingsToday,
           COALESCE(SUM(CASE WHEN DATE(b.booked_at) = CURDATE() THEN b.people END), 0) AS peopleToday
    FROM bookings b WHERE ${ACTIVE}`,
  dashboardRevenue: `
    SELECT COALESCE(SUM(m.amount), 0) AS total,
           COALESCE(SUM(CASE WHEN DATE(m.at) = CURDATE() THEN m.amount END), 0) AS today,
           COALESCE(SUM(DATE(m.at) = CURDATE() AND m.amount > 0), 0) AS todayPayments,
           COALESCE(SUM(CASE WHEN m.at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN m.amount END), 0) AS thisMonth
    FROM (${MONEY_IN}) m`,
  dashboardEvents: `
    SELECT COUNT(*) AS total,
           COALESCE(SUM(start_date >= CURDATE() AND trip_status IN ('upcoming','ongoing')), 0) AS upcoming,
           COALESCE(SUM(trip_status = 'completed' OR end_date < CURDATE()), 0) AS done
    FROM departures WHERE trip_status <> 'cancelled'`,
  // Cancelled bookings that were paid: refunded, or still waiting
  dashboardRefunds: `
    SELECT COALESCE((SELECT SUM(amount) FROM booking_refunds WHERE state = 'completed'), 0) AS refunded,
           COALESCE((SELECT COUNT(DISTINCT booking_id) FROM booking_refunds WHERE state = 'completed'), 0) AS refundedCount,
           COALESCE((SELECT SUM(amount) FROM booking_refunds WHERE state = 'pending'), 0) AS inProcess,
           COALESCE((SELECT COUNT(*) FROM booking_refunds WHERE state = 'pending'), 0) AS inProcessCount,
           COALESCE((SELECT SUM(b.amount_paid) FROM bookings b
                      WHERE b.status = 'cancelled' AND b.amount_paid > 0
                        AND NOT EXISTS (SELECT 1 FROM booking_refunds r WHERE r.booking_id = b.id AND r.state <> 'failed')), 0) AS dueAmount,
           COALESCE((SELECT COUNT(*) FROM bookings b
                      WHERE b.status = 'cancelled' AND b.amount_paid > 0
                        AND NOT EXISTS (SELECT 1 FROM booking_refunds r WHERE r.booking_id = b.id AND r.state <> 'failed')), 0) AS dueCount`,
  dashboardCustomerCount: `SELECT COUNT(DISTINCT b.customer_id) AS total FROM bookings b WHERE ${PAID}`,
  dashboardUpcomingCounts: `
    SELECT COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN start_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END), 0) AS thisWeek,
           COALESCE(SUM(CASE WHEN guide_id IS NULL THEN 1 ELSE 0 END), 0) AS needsTeam
    FROM departures
    WHERE start_date >= CURDATE() AND trip_status IN ('upcoming','ongoing')`,
  dashboardEnquiryCounts: `
    SELECT COALESCE(SUM(e.status = 'new'), 0) AS newCount,
           COALESCE(SUM(e.status <> 'new' AND COALESCE(s.stage, 'open') = 'open'), 0) AS inProgress,
           COALESCE(SUM(s.stage = 'won'), 0) AS booked,
           COALESCE(SUM(s.stage = 'lost'), 0) AS lost
    FROM enquiries e LEFT JOIN lead_statuses s ON s.status_key = e.status`,
  // Brochure downloads are leads in enquiries with source = 'brochure'
  dashboardBrochureCounts: `
    SELECT COUNT(*) AS total,
           COALESCE(SUM(DATE(received_at) = CURDATE()), 0) AS today,
           COALESCE(SUM(e.status = 'new'), 0) AS notContacted,
           COALESCE(SUM(s.stage = 'won'), 0) AS converted
    FROM enquiries e LEFT JOIN lead_statuses s ON s.status_key = e.status
    WHERE e.source = 'brochure'`,
  dashboardRevenueByMonth: `
    SELECT DATE_FORMAT(m.at, '%Y-%m') AS month, COALESCE(SUM(m.amount), 0) AS collected
    FROM (${MONEY_IN}) m
    WHERE m.at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
    GROUP BY month ORDER BY month`,
  dashboardUpcomingDepartures: `
    SELECT d.id, t.name AS trip_name, d.start_date, d.end_date, d.trip_status,
           g.name AS guide_name,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.people END), 0) AS people,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.balance_amount END), 0) AS pending
    FROM departures d
    JOIN trips t ON t.id = d.trip_id
    LEFT JOIN guides g ON g.id = d.guide_id
    LEFT JOIN bookings b ON b.departure_id = d.id
    WHERE d.start_date >= CURDATE() AND d.trip_status IN ('upcoming','ongoing')
    GROUP BY d.id
    ORDER BY d.start_date
    LIMIT 6`,
  /* ================= ACTIVITY LOG ================= */
  // Business activity: enquiries, brochure downloads, bookings, payments, refunds
  activityFeed: `
    SELECT * FROM (
      SELECT IF(e.source = 'brochure', 'brochure', 'enquiry') AS type, e.name AS title,
             COALESCE(t.name, '') AS detail, e.received_at AS at
        FROM enquiries e LEFT JOIN trips t ON t.id = e.trip_id
      UNION ALL
      SELECT 'booking', c.name, CONCAT(b.booking_ref, ' · ', COALESCE(t.name, '')), b.booked_at
        FROM bookings b JOIN customers c ON c.id = b.customer_id LEFT JOIN trips t ON t.id = b.trip_id
      UNION ALL
      SELECT 'payment', COALESCE(c.name, ''), CONCAT('₹', bp.amount, ' · ', b.booking_ref), bp.paid_at
        FROM booking_payments bp
        JOIN bookings b ON b.id = bp.booking_id
        LEFT JOIN customers c ON c.id = b.customer_id
      UNION ALL
      SELECT 'refund', COALESCE(c.name, ''),
             CONCAT('₹', r.amount, ' · ', b.booking_ref, ' · ', IF(r.mode = 'phonepe', 'PhonePe', r.method), ' · ', r.state),
             r.created_at
        FROM booking_refunds r
        JOIN bookings b ON b.id = r.booking_id
        LEFT JOIN customers c ON c.id = b.customer_id
    ) feed
    ORDER BY at DESC
    LIMIT 2000`,
  // What admin users did in the portal
  activityLog: `
    SELECT a.id, a.created_at, a.action, a.entity_type, a.entity_id, a.detail,
           u.full_name, u.username, u.role
    FROM activity_log a
    LEFT JOIN admin_users u ON u.id = a.admin_id
    ORDER BY a.id DESC
    LIMIT 2000`,

  /* ================= NOTIFICATIONS (bell) ================= */
  notificationBookings: `
    SELECT b.id, b.booking_ref, c.name, c.phone, t.name AS trip_name,
           b.trek_start_date, b.people, b.amount_paid, b.balance_amount,
           b.payment_type, b.booked_at AS at
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN trips t ON t.id = b.trip_id
    WHERE b.merchant_order_id IS NOT NULL
    ORDER BY b.id DESC
    LIMIT 20`,
  notificationBookingsLatest: 'SELECT COALESCE(MAX(id), 0) AS id FROM bookings WHERE merchant_order_id IS NOT NULL',
  notificationBrochures: `
    SELECT e.id, e.name, e.phone, t.name AS trip_name, e.received_at AS at
    FROM enquiries e
    LEFT JOIN trips t ON t.id = e.trip_id
    WHERE e.source = 'brochure'
    ORDER BY e.id DESC
    LIMIT 20`,
  notificationBrochuresLatest: "SELECT COALESCE(MAX(id), 0) AS id FROM enquiries WHERE source = 'brochure'",
  notificationInterests: `
    SELECT ti.id, ti.trip_id, t.name AS trip_name, ti.created_at AS at,
           (SELECT COUNT(*) FROM trip_interests x
             WHERE x.trip_id = ti.trip_id AND x.type = 'interested') AS trip_total
    FROM trip_interests ti
    LEFT JOIN trips t ON t.id = ti.trip_id
    WHERE ti.type = 'interested'
    ORDER BY ti.id DESC
    LIMIT 20`,
  notificationInterestsLatest: "SELECT COALESCE(MAX(id), 0) AS id FROM trip_interests WHERE type = 'interested'",

  /* ================= LOOKUPS (dropdowns) ================= */
  lookupTrips: 'SELECT id, name, slug, category_id, with_transport_price, without_transport_price, price FROM trips ORDER BY name',
  lookupCategories: 'SELECT id, name FROM categories ORDER BY sort_order, id',
  lookupGuides: 'SELECT id, name, phone FROM guides WHERE is_active = 1 ORDER BY name',
  lookupPickupPoints: 'SELECT id, trip_id, name, address FROM pickup_points WHERE is_active = 1 ORDER BY sort_order, name',
  lookupUsers: 'SELECT id, full_name, role FROM admin_users WHERE is_active = 1 ORDER BY full_name',
  getGstPercent: "SELECT setting_value FROM settings WHERE setting_key = 'gst_percent'",
  // All lead statuses (inactive too, so old leads still show their label)
  lookupLeadStatuses: 'SELECT id, status_key, label, stage, tone, sort_order, is_active, is_system FROM lead_statuses ORDER BY sort_order, id',
  getLeadStatus: 'SELECT * FROM lead_statuses WHERE status_key = ?',

  /* ================= PACKAGES & TRIPS ================= */
  getTrips: `
    SELECT t.id, t.slug, t.name, t.category_id, c.name AS category_name, c.label AS category_label,
           t.blurb, t.badge_text, t.badge_style, t.featured_order, t.price_note,
           t.duration_label, t.duration_days, t.difficulty, t.distance_label,
           t.price, t.without_transport_price, t.with_transport_price,
           t.is_featured, t.featured_label, t.status, t.updated_at,
           (SELECT COUNT(*) FROM departures d
             WHERE d.trip_id = t.id AND d.start_date >= CURDATE()) AS upcoming_departures,
           (SELECT COUNT(*) FROM bookings b
             WHERE b.trip_id = t.id AND b.status IN ('confirmed','completed')) AS bookings
    FROM trips t
    LEFT JOIN categories c ON c.id = t.category_id
    ORDER BY t.id DESC`,
  getTripById: 'SELECT * FROM trips WHERE id = ?',
  getTripIdBySlug: 'SELECT id FROM trips WHERE slug = ? AND id <> ?',
  createTrip: 'INSERT INTO trips SET ?',
  updateTrip: 'UPDATE trips SET ? WHERE id = ?',
  // What's included / not included (website trek details page); one item per line
  getTripInclusions: 'SELECT inclusion, exclusion FROM inclusion_exclusion WHERE trip_id = ? ORDER BY id',
  deleteTripInclusions: 'DELETE FROM inclusion_exclusion WHERE trip_id = ?',
  // A trip's pickup points (website booking form)
  getTripPickupPoints: 'SELECT id, name, address, map_url, sort_order, is_active FROM pickup_points WHERE trip_id = ? ORDER BY sort_order, id',
  createPickupPoint: 'INSERT INTO pickup_points SET ?',
  updatePickupPoint: 'UPDATE pickup_points SET ? WHERE id = ? AND trip_id = ?',
  createTripInclusions: 'INSERT INTO inclusion_exclusion (trip_id, inclusion, exclusion) VALUES (?, ?, ?)',

  /* ================= TRIP COORDINATION (departures) ================= */
  // Base of the departure list; WHERE / GROUP BY / ORDER BY are added in dbops
  departuresBase: `
    SELECT d.id, d.trip_id, t.name AS trip_name, t.slug,
           d.start_date, d.end_date, d.departure_type, d.seats_total, d.seats_booked,
           d.status, d.trip_status, d.notes,
           d.guide_id, g.name AS guide_name, g.phone AS guide_phone,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.people END), 0) AS people,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN 1 END), 0) AS bookings,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.amount END), 0) AS total_amount,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.amount_paid END), 0) AS paid_amount,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.balance_amount END), 0) AS pending_amount
    FROM departures d
    JOIN trips t ON t.id = d.trip_id
    LEFT JOIN guides g ON g.id = d.guide_id
    LEFT JOIN bookings b ON b.departure_id = d.id`,
  departuresWhereUpcoming: "(d.end_date >= CURDATE() OR d.trip_status IN ('upcoming','ongoing'))",
  departuresWherePast: 'd.end_date < CURDATE()',
  departuresWhereTrip: 'd.trip_id = ?',
  departuresWhereId: 'd.id = ?',
  getDepartureCustomers: `
    SELECT b.id, b.booking_ref, b.status, b.payment_status, b.people,
           b.with_transport_people, b.without_transport_people, b.travel_mode,
           b.amount, b.amount_paid, b.balance_amount, b.payment_type, b.notes,
           c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           p.name AS pickup_name, p.address AS pickup_address
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN pickup_points p ON p.id = b.pickup_point_id
    WHERE b.departure_id = ?
    ORDER BY b.status = 'cancelled', p.sort_order, c.name`,
  findDeparture: 'SELECT id FROM departures WHERE trip_id = ? AND start_date = ? AND end_date = ? AND departure_type = ?',
  getDepartureForBooking: `
    SELECT id, trip_id, start_date, end_date, departure_type,
           DATEDIFF(end_date, start_date) + 1 AS days
    FROM departures WHERE id = ?`,
  createDeparture: 'INSERT INTO departures SET ?',
  updateDeparture: 'UPDATE departures SET ? WHERE id = ?',
  changeDepartureSeats: `
    UPDATE departures
       SET seats_booked = GREATEST(0, seats_booked + ?),
           status = CASE
             WHEN status = 'open' AND seats_booked >= seats_total THEN 'full'
             WHEN status = 'full' AND seats_booked < seats_total THEN 'open'
             ELSE status END
     WHERE id = ?`,

  /* ================= BOOKINGS ================= */
  // Base of the booking list; WHERE / ORDER BY are added in dbops
  bookingsBase: `
    SELECT b.id, b.booking_ref, b.departure_id, b.trip_id, t.name AS trip_name,
           b.trek_start_date, b.trek_end_date, b.trip_days, b.is_custom_trip,
           b.people, b.with_transport_people, b.without_transport_people, b.travel_mode,
           b.amount, b.amount_paid, b.advance_amount, b.balance_amount,
           b.refund_amount, b.refunded_at,
           b.payment_type, b.status, b.payment_status, b.notes,
           b.merchant_order_id, b.payment_transaction_id, b.payment_method, b.paid_at, b.booked_at,
           c.id AS customer_id, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email,
           b.pickup_point_id, p.name AS pickup_name
    FROM bookings b
    JOIN customers c ON c.id = b.customer_id
    LEFT JOIN trips t ON t.id = b.trip_id
    LEFT JOIN pickup_points p ON p.id = b.pickup_point_id`,
  bookingsWhereDeparture: 'b.departure_id = ?',
  bookingsWhereCustomer: 'b.customer_id = ?',
  bookingsWhereId: 'b.id = ?',
  getBookingRow: 'SELECT * FROM bookings WHERE id = ?',
  setInvoiceToken: 'UPDATE bookings SET invoice_token = ? WHERE id = ? AND invoice_token IS NULL',
  getBookingPayments: `
    SELECT bp.id, bp.amount, bp.method, bp.reference, bp.note, bp.paid_at,
           a.full_name AS received_by_name
    FROM booking_payments bp
    LEFT JOIN admin_users a ON a.id = bp.received_by
    WHERE bp.booking_id = ?
    ORDER BY bp.paid_at`,
  createBooking: 'INSERT INTO bookings SET ?',
  setBookingRef: "UPDATE bookings SET booking_ref = CONCAT('TFGW-', YEAR(booked_at), '-', LPAD(id, 4, '0')) WHERE id = ?",
  updateBooking: 'UPDATE bookings SET ? WHERE id = ?',
  updateBookingPayment: 'UPDATE bookings SET amount_paid = ?, balance_amount = ?, payment_status = ?, status = ? WHERE id = ?',
  getRecordedPaymentsTotal: 'SELECT COALESCE(SUM(amount), 0) AS total FROM booking_payments WHERE booking_id = ?',

  /* ================= REFUNDS ================= */
  refundsBase: `
    SELECT r.id, r.booking_id, r.amount, r.mode, r.method, r.merchant_refund_id, r.phonepe_refund_id,
           r.state, r.reference, r.reason, r.error_message, r.created_at, r.completed_at,
           a.full_name AS initiated_by_name,
           b.booking_ref, c.name AS customer_name, c.phone AS customer_phone, t.name AS trip_name
    FROM booking_refunds r
    JOIN bookings b ON b.id = r.booking_id
    LEFT JOIN customers c ON c.id = b.customer_id
    LEFT JOIN trips t ON t.id = b.trip_id
    LEFT JOIN admin_users a ON a.id = r.initiated_by`,
  createRefund: 'INSERT INTO booking_refunds SET ?',
  updateRefundState: `
    UPDATE booking_refunds
    SET state = ?, phonepe_refund_id = COALESCE(?, phonepe_refund_id), error_message = ?,
        completed_at = IF(? = 'completed', COALESCE(completed_at, NOW()), completed_at)
    WHERE id = ?`,
  getPendingPhonePeRefunds: "SELECT id FROM booking_refunds WHERE mode = 'phonepe' AND state = 'pending'",
  // Booking keeps the total of completed refunds
  updateBookingRefundTotals: `
    UPDATE bookings b
    JOIN (SELECT COALESCE(SUM(amount), 0) AS refunded, MAX(completed_at) AS last_at
            FROM booking_refunds WHERE booking_id = ? AND state = 'completed') r
    SET b.refund_amount = r.refunded, b.refunded_at = r.last_at,
        b.payment_status = IF(r.refunded > 0 AND (b.status = 'cancelled' OR r.refunded + 0.009 >= b.amount_paid), 'refunded', b.payment_status)
    WHERE b.id = ?`,
  createBookingPayment: `
    INSERT INTO booking_payments (booking_id, amount, method, reference, note, received_by, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,

  /* ================= CUSTOMERS ================= */
  getCustomers: `
    SELECT c.id, c.name, c.phone, c.email, c.city, c.created_at,
           COUNT(b.id) AS bookings,
           COALESCE(SUM(b.amount_paid), 0) AS total_spent,
           COALESCE(SUM(b.balance_amount), 0) AS balance_due,
           MAX(b.trek_start_date) AS last_trip_date,
           MIN(b.booked_at) AS customer_since,
           (SELECT COUNT(*) FROM enquiries e WHERE (e.customer_id = c.id OR e.phone = c.phone) AND e.source = 'brochure') AS brochure_downloads
    FROM customers c
    JOIN bookings b ON b.customer_id = c.id AND ${PAID}
    GROUP BY c.id
    ORDER BY c.id DESC
    LIMIT 5000`,
  getCustomerById: 'SELECT * FROM customers WHERE id = ?',
  getCustomerIdByPhone: 'SELECT id FROM customers WHERE phone = ? ORDER BY id DESC LIMIT 1',
  getCustomerBookings: `
    SELECT b.id, b.booking_ref, t.name AS trip_name, b.trek_start_date, b.people,
           b.amount, b.amount_paid, b.balance_amount, b.status, b.payment_status
    FROM bookings b LEFT JOIN trips t ON t.id = b.trip_id
    WHERE b.customer_id = ? ORDER BY b.booked_at DESC`,
  getCustomerEnquiries: `
    SELECT e.id, t.name AS trip_name, e.status, e.source, e.received_at, e.note
    FROM enquiries e LEFT JOIN trips t ON t.id = e.trip_id
    WHERE e.customer_id = ? OR e.phone = ? ORDER BY e.received_at DESC`,
  createCustomer: 'INSERT INTO customers (name, phone, email, trip_id, created_at) VALUES (?, ?, ?, ?, NOW())',
  linkLeadsToCustomer: 'UPDATE enquiries SET customer_id = ? WHERE phone = ? AND customer_id IS NULL',
  updateCustomer: 'UPDATE customers SET ? WHERE id = ?',

  /* ================= ENQUIRIES ================= */
  getEnquiries: `
    SELECT e.id, e.name, e.phone, e.email, e.trip_id, t.name AS trip_name,
           e.people, e.note, e.status, e.source, e.assigned_to,
           a.full_name AS assigned_name, e.received_at, e.updated_at
    FROM enquiries e
    LEFT JOIN trips t ON t.id = e.trip_id
    LEFT JOIN admin_users a ON a.id = e.assigned_to
    ORDER BY e.received_at DESC
    LIMIT 5000`,
  createEnquiry: 'INSERT INTO enquiries SET ?',
  updateEnquiry: 'UPDATE enquiries SET ? WHERE id = ?',

  /* ================= PAYMENTS ================= */
  getOnlinePayments: `
    SELECT pt.id, pt.merchant_order_id, pt.transaction_id, pt.payment_method,
           pt.amount / 100 AS amount, pt.status, pt.phonepe_state,
           pt.created_at, pt.updated_at,
           b.id AS booking_id, b.booking_ref, b.amount_paid AS booking_paid, b.status AS booking_status,
           COALESCE(b.refund_amount, 0) AS refunded_amount,
           (SELECT COALESCE(SUM(r.amount), 0) FROM booking_refunds r WHERE r.booking_id = b.id AND r.state = 'pending') AS refund_pending,
           COALESCE(c.name, JSON_UNQUOTE(JSON_EXTRACT(pt.booking_details, '$.customerName'))) AS customer_name,
           COALESCE(c.phone, JSON_UNQUOTE(JSON_EXTRACT(pt.booking_details, '$.customerPhone'))) AS customer_phone,
           JSON_UNQUOTE(JSON_EXTRACT(pt.booking_details, '$.trekName')) AS trip_name,
           JSON_UNQUOTE(JSON_EXTRACT(pt.booking_details, '$.paymentType')) AS payment_type
    FROM phonepe_transactions pt
    LEFT JOIN bookings b ON b.merchant_order_id = pt.merchant_order_id
    LEFT JOIN customers c ON c.id = b.customer_id
    ORDER BY pt.created_at DESC
    LIMIT 5000`,
  getOfflinePayments: `
    SELECT bp.id, bp.amount, bp.method, bp.reference, bp.note, bp.paid_at,
           b.id AS booking_id, b.booking_ref, b.amount_paid AS booking_paid, b.status AS booking_status,
           COALESCE(b.refund_amount, 0) AS refunded_amount,
           (SELECT COALESCE(SUM(r.amount), 0) FROM booking_refunds r WHERE r.booking_id = b.id AND r.state = 'pending') AS refund_pending,
           c.name AS customer_name,
           t.name AS trip_name, a.full_name AS received_by_name
    FROM booking_payments bp
    JOIN bookings b ON b.id = bp.booking_id
    LEFT JOIN customers c ON c.id = b.customer_id
    LEFT JOIN trips t ON t.id = b.trip_id
    LEFT JOIN admin_users a ON a.id = bp.received_by
    ORDER BY bp.paid_at DESC
    LIMIT 5000`,
  getOnlinePaymentStats: `
    SELECT COALESCE(SUM(CASE WHEN status = 'SUCCESS' THEN amount END), 0) / 100 AS success_amount,
           COALESCE(SUM(status = 'SUCCESS'), 0) AS success_count,
           COALESCE(SUM(CASE WHEN status IN ('PROCESSING','PENDING') THEN amount END), 0) / 100 AS pending_amount,
           COALESCE(SUM(status IN ('PROCESSING','PENDING')), 0) AS pending_count,
           COALESCE(SUM(CASE WHEN status IN ('FAILED','CANCELLED') THEN amount END), 0) / 100 AS failed_amount,
           COALESCE(SUM(status IN ('FAILED','CANCELLED')), 0) AS failed_count
    FROM phonepe_transactions`,

  /* ================= MASTER DATA ================= */
  // ?? is a table name; the allowed tables are listed in the component
  masterList: {
    guides: 'SELECT * FROM guides ORDER BY is_active DESC, name',
    pickup_points: `
      SELECT p.*, t.name AS trip_name
      FROM pickup_points p LEFT JOIN trips t ON t.id = p.trip_id
      ORDER BY t.name, p.sort_order, p.name`,
    categories: 'SELECT * FROM categories ORDER BY sort_order, id',
    lead_statuses: 'SELECT * FROM lead_statuses ORDER BY sort_order, id',
  },
  getMasterRow: 'SELECT * FROM ?? WHERE id = ?',
  createMaster: 'INSERT INTO ?? SET ?',
  updateMaster: 'UPDATE ?? SET ? WHERE id = ?',

  /* ================= REVIEWS ================= */
  getReviews: `
    SELECT r.id, r.source, r.google_review_id, r.trip_id, t.name AS trip_name,
           r.author_name, r.author_photo_url, r.rating, r.body, r.owner_reply,
           r.trip_month, r.status, r.created_at, r.published_at, r.updated_at
    FROM reviews r LEFT JOIN trips t ON t.id = r.trip_id
    ORDER BY r.created_at DESC
    LIMIT 5000`,
  updateReviewStatus: `
    UPDATE reviews
    SET status = ?, moderated_by = ?,
        published_at = IF(? = 'published', COALESCE(published_at, NOW()), published_at)
    WHERE id = ?`,
  getGoogleReviewIds: "SELECT google_review_id FROM reviews WHERE source = 'google'",
  // New Google reviews go live on the website; later syncs update the text,
  // rating and reply but keep the status chosen in the admin
  upsertGoogleReview: `
    INSERT INTO reviews
      (source, google_review_id, author_name, author_photo_url, rating, body, owner_reply,
       status, created_at, published_at, updated_at)
    VALUES ('google', ?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      author_name = VALUES(author_name), author_photo_url = VALUES(author_photo_url),
      rating = VALUES(rating), body = VALUES(body), owner_reply = VALUES(owner_reply),
      updated_at = VALUES(updated_at)`,
  deleteGoogleReviewsExcept: "DELETE FROM reviews WHERE source = 'google' AND google_review_id NOT IN (?)",
  deleteAllGoogleReviews: "DELETE FROM reviews WHERE source = 'google'",

  getGoogleBusiness: 'SELECT * FROM google_business WHERE id = 1',
  saveGoogleConnection: `
    INSERT INTO google_business (id, refresh_token, connected_email, connected_by, last_error)
    VALUES (1, ?, ?, ?, NULL)
    ON DUPLICATE KEY UPDATE refresh_token = VALUES(refresh_token), connected_email = VALUES(connected_email),
      connected_by = VALUES(connected_by), last_error = NULL`,
  setGoogleLocation: 'UPDATE google_business SET account_name = ?, location_name = ?, location_title = ? WHERE id = 1',
  setGoogleSynced: 'UPDATE google_business SET average_rating = ?, total_reviews = ?, last_synced_at = NOW(), last_error = NULL WHERE id = 1',
  setGoogleError: 'INSERT INTO google_business (id, last_error) VALUES (1, ?) ON DUPLICATE KEY UPDATE last_error = VALUES(last_error)',
  clearGoogleConnection: `
    UPDATE google_business
    SET refresh_token = NULL, connected_email = NULL, account_name = NULL, location_name = NULL,
        location_title = NULL, last_error = NULL
    WHERE id = 1`,

  /* ================= WEBSITE HERO ================= */
  getHeroSettings: 'SELECT * FROM site_hero WHERE id = 1',
  // Each hero = one slide with its own photo, texts, buttons and stats
  getHeroSlides: 'SELECT * FROM hero_slides ORDER BY sort_order, id',
  // Shared settings (time per hero)
  saveHeroSettings: 'UPDATE site_hero SET ? WHERE id = 1',
  createHeroSlide: 'INSERT INTO hero_slides SET ?',
  updateHeroSlide: 'UPDATE hero_slides SET ? WHERE id = ?',
  deleteHeroSlide: 'DELETE FROM hero_slides WHERE id = ?',

  /* ================= SETTINGS ================= */
  getSettings: 'SELECT setting_key, setting_value, label, updated_at FROM settings ORDER BY label',
  updateSetting: 'UPDATE settings SET setting_value = ? WHERE setting_key = ?',

  /* ================= HEALTH ================= */
  ping: 'SELECT 1',
};

module.exports = sqlqueries;
