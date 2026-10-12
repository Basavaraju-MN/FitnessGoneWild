// All SQL used by the admin API, grouped by section.
// dbops.js runs these; nothing else writes SQL.

// Bookings that count as real business (not pending / cancelled)
const ACTIVE = "b.status IN ('confirmed','completed')";

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
           COALESCE(SUM(CASE WHEN b.booked_at >= DATE_FORMAT(CURDATE(), '%Y-%m-01') THEN 1 ELSE 0 END), 0) AS bookingsThisMonth
    FROM bookings b WHERE ${ACTIVE}`,
  dashboardCustomerCount: 'SELECT COUNT(*) AS total FROM customers',
  dashboardUpcomingCounts: `
    SELECT COUNT(*) AS total,
           COALESCE(SUM(CASE WHEN start_date <= DATE_ADD(CURDATE(), INTERVAL 7 DAY) THEN 1 ELSE 0 END), 0) AS thisWeek,
           COALESCE(SUM(CASE WHEN guide_id IS NULL OR vehicle_id IS NULL OR driver_id IS NULL THEN 1 ELSE 0 END), 0) AS needsTeam
    FROM departures
    WHERE start_date >= CURDATE() AND trip_status IN ('upcoming','ongoing')`,
  dashboardEnquiryCounts: `
    SELECT COALESCE(SUM(status = 'new'), 0) AS newCount,
           COALESCE(SUM(status = 'contacted'), 0) AS contacted,
           COALESCE(SUM(status = 'interested'), 0) AS interested,
           COALESCE(SUM(status = 'booked'), 0) AS booked
    FROM enquiries`,
  dashboardBrochureCounts: `
    SELECT COUNT(*) AS total,
           COALESCE(SUM(DATE(downloaded_at) = CURDATE()), 0) AS today,
           COALESCE(SUM(follow_up_status = 'not_contacted'), 0) AS notContacted,
           COALESCE(SUM(follow_up_status = 'converted'), 0) AS converted
    FROM brochure_downloads`,
  dashboardRevenueByMonth: `
    SELECT DATE_FORMAT(b.booked_at, '%Y-%m') AS month,
           COALESCE(SUM(b.amount_paid), 0) AS collected,
           COUNT(*) AS bookings
    FROM bookings b
    WHERE ${ACTIVE}
      AND b.booked_at >= DATE_SUB(DATE_FORMAT(CURDATE(), '%Y-%m-01'), INTERVAL 5 MONTH)
    GROUP BY month ORDER BY month`,
  dashboardUpcomingDepartures: `
    SELECT d.id, t.name AS trip_name, d.start_date, d.end_date, d.trip_status,
           g.name AS guide_name, v.vehicle_number, dr.name AS driver_name,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.people END), 0) AS people,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.balance_amount END), 0) AS pending
    FROM departures d
    JOIN trips t ON t.id = d.trip_id
    LEFT JOIN guides g ON g.id = d.guide_id
    LEFT JOIN vehicles v ON v.id = d.vehicle_id
    LEFT JOIN drivers dr ON dr.id = d.driver_id
    LEFT JOIN bookings b ON b.departure_id = d.id
    WHERE d.start_date >= CURDATE() AND d.trip_status IN ('upcoming','ongoing')
    GROUP BY d.id
    ORDER BY d.start_date
    LIMIT 6`,
  dashboardActivity: `
    SELECT * FROM (
      SELECT 'enquiry' AS type, e.name AS title, COALESCE(t.name, '') AS detail, e.received_at AS at
        FROM enquiries e LEFT JOIN trips t ON t.id = e.trip_id
      UNION ALL
      SELECT 'booking', c.name, CONCAT(b.booking_ref, ' · ', COALESCE(t.name, '')), b.booked_at
        FROM bookings b JOIN customers c ON c.id = b.customer_id LEFT JOIN trips t ON t.id = b.trip_id
      UNION ALL
      SELECT 'brochure', bd.name, COALESCE(t.name, ''), bd.downloaded_at
        FROM brochure_downloads bd LEFT JOIN trips t ON t.id = bd.trip_id
      UNION ALL
      SELECT 'payment', COALESCE(c.name, ''), CONCAT('₹', bp.amount, ' · ', b.booking_ref), bp.paid_at
        FROM booking_payments bp
        JOIN bookings b ON b.id = bp.booking_id
        LEFT JOIN customers c ON c.id = b.customer_id
    ) feed
    ORDER BY at DESC
    LIMIT 8`,

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
    SELECT bd.id, bd.name, bd.phone, t.name AS trip_name, bd.downloaded_at AS at
    FROM brochure_downloads bd
    LEFT JOIN trips t ON t.id = bd.trip_id
    ORDER BY bd.id DESC
    LIMIT 20`,
  notificationBrochuresLatest: 'SELECT COALESCE(MAX(id), 0) AS id FROM brochure_downloads',
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
  lookupVehicles: 'SELECT id, vehicle_number, vehicle_type FROM vehicles WHERE is_active = 1 ORDER BY vehicle_number',
  lookupDrivers: 'SELECT id, name, phone FROM drivers WHERE is_active = 1 ORDER BY name',
  lookupPickupPoints: 'SELECT id, trip_id, name, address FROM pickup_points WHERE is_active = 1 ORDER BY sort_order, name',
  lookupUsers: 'SELECT id, full_name, role FROM admin_users WHERE is_active = 1 ORDER BY full_name',

  /* ================= PACKAGES & TRIPS ================= */
  getTrips: `
    SELECT t.id, t.slug, t.name, t.category_id, c.name AS category_name,
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

  /* ================= TRIP COORDINATION (departures) ================= */
  // Base of the departure list; WHERE / GROUP BY / ORDER BY are added in dbops
  departuresBase: `
    SELECT d.id, d.trip_id, t.name AS trip_name, t.slug,
           d.start_date, d.end_date, d.departure_type, d.seats_total, d.seats_booked,
           d.status, d.trip_status, d.notes,
           d.guide_id, g.name AS guide_name, g.phone AS guide_phone,
           d.vehicle_id, v.vehicle_number, v.vehicle_type,
           d.driver_id, dr.name AS driver_name, dr.phone AS driver_phone,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.people END), 0) AS people,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN 1 END), 0) AS bookings,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.amount END), 0) AS total_amount,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.amount_paid END), 0) AS paid_amount,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.balance_amount END), 0) AS pending_amount
    FROM departures d
    JOIN trips t ON t.id = d.trip_id
    LEFT JOIN guides g ON g.id = d.guide_id
    LEFT JOIN vehicles v ON v.id = d.vehicle_id
    LEFT JOIN drivers dr ON dr.id = d.driver_id
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
           p.name AS pickup_name
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
  createBookingPayment: `
    INSERT INTO booking_payments (booking_id, amount, method, reference, note, received_by, paid_at)
    VALUES (?, ?, ?, ?, ?, ?, COALESCE(?, NOW()))`,

  /* ================= CUSTOMERS ================= */
  getCustomers: `
    SELECT c.id, c.name, c.phone, c.email, c.city, c.created_at,
           COUNT(b.id) AS bookings,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.amount_paid END), 0) AS total_spent,
           COALESCE(SUM(CASE WHEN ${ACTIVE} THEN b.balance_amount END), 0) AS balance_due,
           MAX(b.trek_start_date) AS last_trip_date,
           (SELECT COUNT(*) FROM brochure_downloads bd WHERE bd.customer_id = c.id) AS brochure_downloads
    FROM customers c
    LEFT JOIN bookings b ON b.customer_id = c.id
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
  getCustomerDownloads: `
    SELECT bd.id, t.name AS trip_name, bd.follow_up_status, bd.downloaded_at
    FROM brochure_downloads bd LEFT JOIN trips t ON t.id = bd.trip_id
    WHERE bd.customer_id = ? OR bd.phone = ? ORDER BY bd.downloaded_at DESC`,
  getCustomerEnquiries: `
    SELECT e.id, t.name AS trip_name, e.status, e.received_at, e.note
    FROM enquiries e LEFT JOIN trips t ON t.id = e.trip_id
    WHERE e.customer_id = ? OR e.phone = ? ORDER BY e.received_at DESC`,
  createCustomer: 'INSERT INTO customers (name, phone, email, trip_id, created_at) VALUES (?, ?, ?, ?, NOW())',
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

  /* ================= BROCHURE DOWNLOADS ================= */
  getBrochureDownloads: `
    SELECT bd.id, bd.customer_id, bd.name, bd.phone, bd.email,
           bd.trip_id, t.name AS trip_name, bd.follow_up_status, bd.notes,
           bd.assigned_to, a.full_name AS assigned_name,
           bd.downloaded_at, bd.updated_at
    FROM brochure_downloads bd
    LEFT JOIN trips t ON t.id = bd.trip_id
    LEFT JOIN admin_users a ON a.id = bd.assigned_to
    ORDER BY bd.downloaded_at DESC
    LIMIT 5000`,
  getBrochureDownloadStats: `
    SELECT COUNT(*) AS total,
           COALESCE(SUM(DATE(downloaded_at) = CURDATE()), 0) AS today,
           COUNT(DISTINCT phone) AS unique_leads,
           COALESCE(SUM(follow_up_status = 'not_contacted'), 0) AS not_contacted,
           COALESCE(SUM(follow_up_status = 'converted'), 0) AS converted
    FROM brochure_downloads`,
  updateBrochureDownload: 'UPDATE brochure_downloads SET ? WHERE id = ?',

  /* ================= PAYMENTS ================= */
  getOnlinePayments: `
    SELECT pt.id, pt.merchant_order_id, pt.transaction_id, pt.payment_method,
           pt.amount / 100 AS amount, pt.status, pt.phonepe_state,
           pt.created_at, pt.updated_at,
           b.id AS booking_id, b.booking_ref,
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
           b.id AS booking_id, b.booking_ref, c.name AS customer_name,
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
    vehicles: 'SELECT * FROM vehicles ORDER BY is_active DESC, vehicle_number',
    drivers: 'SELECT * FROM drivers ORDER BY is_active DESC, name',
    pickup_points: `
      SELECT p.*, t.name AS trip_name
      FROM pickup_points p LEFT JOIN trips t ON t.id = p.trip_id
      ORDER BY t.name, p.sort_order, p.name`,
    categories: 'SELECT * FROM categories ORDER BY sort_order, id',
  },
  createMaster: 'INSERT INTO ?? SET ?',
  updateMaster: 'UPDATE ?? SET ? WHERE id = ?',

  /* ================= SETTINGS ================= */
  getSettings: 'SELECT setting_key, setting_value, label, updated_at FROM settings ORDER BY label',
  updateSetting: 'UPDATE settings SET setting_value = ? WHERE setting_key = ?',

  /* ================= HEALTH ================= */
  ping: 'SELECT 1',
};

module.exports = sqlqueries;
