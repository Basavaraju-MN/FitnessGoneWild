const { executeQuery } = require('./connection');
const sqlQueries = require('./sqlqueries');

const first = (rows) => rows[0] || null;

// Adds optional WHERE conditions to a base query
const withWhere = (base, conditions) =>
  conditions.length ? `${base} WHERE ${conditions.join(' AND ')}` : base;

class Cmds {
  /* ================= AUTH & USERS ================= */
  async getAdminById(id) {
    return first(await executeQuery(sqlQueries.getAdminById, [id]));
  }

  async getAdminByLogin(login) {
    return first(await executeQuery(sqlQueries.getAdminByLogin, [login, login]));
  }

  async getAdminPasswordHash(id) {
    return first(await executeQuery(sqlQueries.getAdminPasswordHash, [id]))?.password_hash || null;
  }

  async updateAdminLastLogin(id) {
    await executeQuery(sqlQueries.updateAdminLastLogin, [id]);
  }

  async updateAdminPassword(id, passwordHash) {
    await executeQuery(sqlQueries.updateAdminPassword, [passwordHash, id]);
  }

  async getAdminUsers() {
    return executeQuery(sqlQueries.getAdminUsers);
  }

  async getAdminUserBasic(id) {
    return first(await executeQuery(sqlQueries.getAdminUserBasic, [id]));
  }

  async createAdminUser(data) {
    return (await executeQuery(sqlQueries.createAdminUser, [data])).insertId;
  }

  async updateAdminUser(id, data) {
    return (await executeQuery(sqlQueries.updateAdminUser, [data, id])).affectedRows;
  }

  /* ================= ACTIVITY LOG ================= */
  async createActivity(adminId, action, entityType, entityId, detail) {
    await executeQuery(sqlQueries.createActivity, [adminId, action, entityType, entityId, detail]);
  }

  /* ================= DASHBOARD ================= */
  async getDashboardData() {
    const [
      bookingTotals, customerCount, upcomingCounts, enquiryCounts,
      brochureCounts, revenue, upcoming, money, events, refunds,
    ] = await Promise.all([
      executeQuery(sqlQueries.dashboardBookingTotals).then(first),
      executeQuery(sqlQueries.dashboardCustomerCount).then(first),
      executeQuery(sqlQueries.dashboardUpcomingCounts).then(first),
      executeQuery(sqlQueries.dashboardEnquiryCounts).then(first),
      executeQuery(sqlQueries.dashboardBrochureCounts).then(first),
      executeQuery(sqlQueries.dashboardRevenueByMonth),
      executeQuery(sqlQueries.dashboardUpcomingDepartures),
      executeQuery(sqlQueries.dashboardRevenue).then(first),
      executeQuery(sqlQueries.dashboardEvents).then(first),
      executeQuery(sqlQueries.dashboardRefunds).then(first),
    ]);

    return {
      bookingTotals, customerCount, upcomingCounts, enquiryCounts,
      brochureCounts, revenue, upcoming, money, events, refunds,
    };
  }

  /* ================= ACTIVITY LOG ================= */
  async getActivityFeed() {
    return executeQuery(sqlQueries.activityFeed);
  }

  async getActivityLog() {
    return executeQuery(sqlQueries.activityLog);
  }

  /* ================= NOTIFICATIONS ================= */
  async getNotificationFeed(type) {
    const queries = {
      booking: [sqlQueries.notificationBookings, sqlQueries.notificationBookingsLatest],
      brochure: [sqlQueries.notificationBrochures, sqlQueries.notificationBrochuresLatest],
      interest: [sqlQueries.notificationInterests, sqlQueries.notificationInterestsLatest],
    }[type];

    const [items, latest] = await Promise.all([
      executeQuery(queries[0]),
      executeQuery(queries[1]).then(first),
    ]);

    return { items, latestId: Number(latest.id) };
  }

  /* ================= LOOKUPS ================= */
  async getLookups() {
    const [trips, categories, guides, pickupPoints, users, leadStatuses, gstPercent] = await Promise.all([
      executeQuery(sqlQueries.lookupTrips),
      executeQuery(sqlQueries.lookupCategories),
      executeQuery(sqlQueries.lookupGuides),
      executeQuery(sqlQueries.lookupPickupPoints),
      executeQuery(sqlQueries.lookupUsers),
      executeQuery(sqlQueries.lookupLeadStatuses),
      this.getGstPercent(),
    ]);

    return { trips, categories, guides, pickupPoints, users, leadStatuses, gstPercent };
  }

  // GST % from Settings (5 when not set)
  async getGstPercent() {
    const value = Number(first(await executeQuery(sqlQueries.getGstPercent))?.setting_value);
    return Number.isFinite(value) && value >= 0 ? value : 5;
  }

  async getLeadStatus(key) {
    return first(await executeQuery(sqlQueries.getLeadStatus, [key]));
  }

  /* ================= PACKAGES & TRIPS ================= */
  async getTrips() {
    return executeQuery(sqlQueries.getTrips);
  }

  async getTripById(id) {
    return first(await executeQuery(sqlQueries.getTripById, [id]));
  }

  // Another trip (not excludeId) already using this slug
  async isSlugTaken(slug, excludeId = 0) {
    return Boolean(first(await executeQuery(sqlQueries.getTripIdBySlug, [slug, excludeId])));
  }

  async createTrip(data) {
    return (await executeQuery(sqlQueries.createTrip, [data])).insertId;
  }

  async updateTrip(id, data) {
    return (await executeQuery(sqlQueries.updateTrip, [data, id])).affectedRows;
  }

  // { inclusions, exclusions } as text, one item per line
  async getTripInclusions(tripId) {
    const rows = await executeQuery(sqlQueries.getTripInclusions, [tripId]);
    const join = (key) => rows.map((r) => (r[key] || '').trim()).filter(Boolean).join('\n');
    return { inclusions: join('inclusion'), exclusions: join('exclusion') };
  }

  // Replaces the trip's inclusions/exclusions with one row (none if both empty)
  async saveTripInclusions(tripId, inclusions, exclusions) {
    await executeQuery(sqlQueries.deleteTripInclusions, [tripId]);
    if (inclusions || exclusions) {
      await executeQuery(sqlQueries.createTripInclusions, [tripId, inclusions || null, exclusions || null]);
    }
  }

  // All of a trip's pickup points, active and hidden
  async getTripPickupPoints(tripId) {
    return executeQuery(sqlQueries.getTripPickupPoints, [tripId]);
  }

  async createPickupPoint(data) {
    return (await executeQuery(sqlQueries.createPickupPoint, [data])).insertId;
  }

  async updatePickupPoint(tripId, id, data) {
    await executeQuery(sqlQueries.updatePickupPoint, [data, id, tripId]);
  }

  /* ================= TRIP COORDINATION ================= */
  // when: 'upcoming' | 'past' | 'all'
  async getDepartures({ when = 'upcoming', tripId } = {}) {
    const conditions = [];
    const params = [];

    if (when === 'upcoming') conditions.push(sqlQueries.departuresWhereUpcoming);
    if (when === 'past') conditions.push(sqlQueries.departuresWherePast);
    if (tripId) {
      conditions.push(sqlQueries.departuresWhereTrip);
      params.push(tripId);
    }

    const sql = `${withWhere(sqlQueries.departuresBase, conditions)}
      GROUP BY d.id
      ORDER BY d.start_date ${when === 'past' ? 'DESC' : 'ASC'}`;

    return executeQuery(sql, params);
  }

  async getDepartureById(id) {
    const sql = `${withWhere(sqlQueries.departuresBase, [sqlQueries.departuresWhereId])} GROUP BY d.id`;
    return first(await executeQuery(sql, [id]));
  }

  async getDepartureCustomers(id) {
    return executeQuery(sqlQueries.getDepartureCustomers, [id]);
  }

  async findDeparture({ trip_id, start_date, end_date, departure_type }) {
    return first(await executeQuery(sqlQueries.findDeparture, [trip_id, start_date, end_date, departure_type]));
  }

  async getDepartureForBooking(id) {
    return first(await executeQuery(sqlQueries.getDepartureForBooking, [id]));
  }

  async createDeparture(data) {
    return (await executeQuery(sqlQueries.createDeparture, [data])).insertId;
  }

  async updateDeparture(id, data) {
    return (await executeQuery(sqlQueries.updateDeparture, [data, id])).affectedRows;
  }

  async changeDepartureSeats(id, delta) {
    await executeQuery(sqlQueries.changeDepartureSeats, [delta, id]);
  }

  /* ================= BOOKINGS ================= */
  async getBookings({ departureId, customerId } = {}) {
    const conditions = [];
    const params = [];

    if (departureId) {
      conditions.push(sqlQueries.bookingsWhereDeparture);
      params.push(departureId);
    }
    if (customerId) {
      conditions.push(sqlQueries.bookingsWhereCustomer);
      params.push(customerId);
    }

    const sql = `${withWhere(sqlQueries.bookingsBase, conditions)} ORDER BY b.booked_at DESC LIMIT 2000`;
    return executeQuery(sql, params);
  }

  async getBookingById(id) {
    const sql = withWhere(sqlQueries.bookingsBase, [sqlQueries.bookingsWhereId]);
    return first(await executeQuery(sql, [id]));
  }

  // Raw bookings row (for updates)
  async getBookingRow(id) {
    return first(await executeQuery(sqlQueries.getBookingRow, [id]));
  }

  async setInvoiceToken(id, token) {
    await executeQuery(sqlQueries.setInvoiceToken, [token, id]);
  }

  async getBookingPayments(bookingId) {
    return executeQuery(sqlQueries.getBookingPayments, [bookingId]);
  }

  async createBooking(data) {
    return (await executeQuery(sqlQueries.createBooking, [data])).insertId;
  }

  async setBookingRef(id) {
    await executeQuery(sqlQueries.setBookingRef, [id]);
  }

  async updateBooking(id, data) {
    await executeQuery(sqlQueries.updateBooking, [data, id]);
  }

  async updateBookingPayment(id, { amountPaid, balance, paymentStatus, status }) {
    await executeQuery(sqlQueries.updateBookingPayment, [amountPaid, balance, paymentStatus, status, id]);
  }

  async getRecordedPaymentsTotal(bookingId) {
    return Number(first(await executeQuery(sqlQueries.getRecordedPaymentsTotal, [bookingId]))?.total || 0);
  }

  /* ================= REFUNDS ================= */
  async getRefunds() {
    return executeQuery(`${sqlQueries.refundsBase} ORDER BY r.id DESC LIMIT 2000`);
  }

  async getBookingRefunds(bookingId) {
    return executeQuery(`${sqlQueries.refundsBase} WHERE r.booking_id = ? ORDER BY r.id`, [bookingId]);
  }

  async getRefund(id) {
    return first(await executeQuery(`${sqlQueries.refundsBase} WHERE r.id = ?`, [id]));
  }

  async createRefund({ bookingId, amount, mode, method, state, merchantRefundId, reference, reason, initiatedBy, completedAt }) {
    const row = {
      booking_id: bookingId, amount, mode, method: method || null, state,
      merchant_refund_id: merchantRefundId || null, reference: reference || null,
      reason: reason || null, initiated_by: initiatedBy || null, completed_at: completedAt || null,
    };
    return (await executeQuery(sqlQueries.createRefund, [row])).insertId;
  }

  async updateRefundState(id, { state, phonepeRefundId, error }) {
    await executeQuery(sqlQueries.updateRefundState, [state, phonepeRefundId || null, error || null, state, id]);
  }

  async getPendingPhonePeRefunds() {
    return executeQuery(sqlQueries.getPendingPhonePeRefunds);
  }

  async updateBookingRefundTotals(bookingId) {
    await executeQuery(sqlQueries.updateBookingRefundTotals, [bookingId, bookingId]);
  }

  async createBookingPayment({ bookingId, amount, method, reference, note, receivedBy, paidAt }) {
    await executeQuery(sqlQueries.createBookingPayment, [
      bookingId, amount, method, reference || null, note || null, receivedBy, paidAt || null,
    ]);
  }

  /* ================= CUSTOMERS ================= */
  async getCustomers() {
    return executeQuery(sqlQueries.getCustomers);
  }

  async getCustomerById(id) {
    return first(await executeQuery(sqlQueries.getCustomerById, [id]));
  }

  async getCustomerIdByPhone(phone) {
    return first(await executeQuery(sqlQueries.getCustomerIdByPhone, [phone]))?.id || null;
  }

  async getCustomerHistory(customer) {
    // Enquiries include brochure downloads (source = brochure)
    const [bookings, enquiries] = await Promise.all([
      executeQuery(sqlQueries.getCustomerBookings, [customer.id]),
      executeQuery(sqlQueries.getCustomerEnquiries, [customer.id, customer.phone]),
    ]);
    return { bookings, enquiries };
  }

  async linkLeadsToCustomer(customerId, phone) {
    await executeQuery(sqlQueries.linkLeadsToCustomer, [customerId, phone]);
  }

  async createCustomer({ name, phone, email, tripId }) {
    return (await executeQuery(sqlQueries.createCustomer, [name, phone, email || null, tripId || null])).insertId;
  }

  async updateCustomer(id, data) {
    return (await executeQuery(sqlQueries.updateCustomer, [data, id])).affectedRows;
  }

  /* ================= ENQUIRIES ================= */
  async getEnquiries() {
    return executeQuery(sqlQueries.getEnquiries);
  }

  async createEnquiry(data) {
    return (await executeQuery(sqlQueries.createEnquiry, [data])).insertId;
  }

  async updateEnquiry(id, data) {
    return (await executeQuery(sqlQueries.updateEnquiry, [data, id])).affectedRows;
  }

  /* ================= PAYMENTS ================= */
  async getPayments() {
    const [online, offline, stats] = await Promise.all([
      executeQuery(sqlQueries.getOnlinePayments),
      executeQuery(sqlQueries.getOfflinePayments),
      executeQuery(sqlQueries.getOnlinePaymentStats).then(first),
    ]);
    return { online, offline, stats };
  }

  /* ================= MASTER DATA ================= */
  async getMasterList(table) {
    return executeQuery(sqlQueries.masterList[table]);
  }

  async getMasterRow(table, id) {
    return first(await executeQuery(sqlQueries.getMasterRow, [table, id]));
  }

  async createMaster(table, data) {
    return (await executeQuery(sqlQueries.createMaster, [table, data])).insertId;
  }

  async updateMaster(table, id, data) {
    return (await executeQuery(sqlQueries.updateMaster, [table, data, id])).affectedRows;
  }

  /* ================= SETTINGS ================= */
  async getSettings() {
    return executeQuery(sqlQueries.getSettings);
  }

  async updateSetting(key, value) {
    await executeQuery(sqlQueries.updateSetting, [value, key]);
  }

  /* ================= REVIEWS ================= */
  async getReviews() {
    return executeQuery(sqlQueries.getReviews);
  }

  async updateReviewStatus(id, status, adminId) {
    const result = await executeQuery(sqlQueries.updateReviewStatus, [status, adminId, status, id]);
    return result.affectedRows > 0;
  }

  async getGoogleReviewIds() {
    return (await executeQuery(sqlQueries.getGoogleReviewIds)).map((r) => r.google_review_id);
  }

  async upsertGoogleReview(r) {
    await executeQuery(sqlQueries.upsertGoogleReview, [
      r.google_review_id, r.author_name, r.author_photo_url, r.rating, r.body, r.owner_reply,
      r.created_at, r.created_at, r.updated_at,
    ]);
  }

  // Removes Google reviews that are no longer on Google; returns how many
  async deleteGoogleReviewsExcept(ids) {
    const result = ids.length
      ? await executeQuery(sqlQueries.deleteGoogleReviewsExcept, [ids])
      : await executeQuery(sqlQueries.deleteAllGoogleReviews);
    return result.affectedRows || 0;
  }

  async getGoogleBusiness() {
    return first(await executeQuery(sqlQueries.getGoogleBusiness));
  }

  async saveGoogleConnection({ refreshToken, email, adminId }) {
    await executeQuery(sqlQueries.saveGoogleConnection, [refreshToken, email, adminId || null]);
  }

  async setGoogleLocation({ account_name: accountName, location_name: locationName, title }) {
    await executeQuery(sqlQueries.setGoogleLocation, [accountName, locationName, title || null]);
  }

  async setGoogleSynced({ averageRating, totalReviews }) {
    await executeQuery(sqlQueries.setGoogleSynced, [averageRating ?? null, totalReviews ?? null]);
  }

  async setGoogleError(message) {
    await executeQuery(sqlQueries.setGoogleError, [message]);
  }

  async clearGoogleConnection() {
    await executeQuery(sqlQueries.clearGoogleConnection);
  }

  /* ================= WEBSITE HERO ================= */
  async getHeroSettings() {
    return first(await executeQuery(sqlQueries.getHeroSettings));
  }

  async getHeroSlides() {
    return executeQuery(sqlQueries.getHeroSlides);
  }

  async saveHeroSettings(data) {
    await executeQuery(sqlQueries.saveHeroSettings, [data]);
  }

  async createHeroSlide(row) {
    return (await executeQuery(sqlQueries.createHeroSlide, [row])).insertId;
  }

  async updateHeroSlide(id, row) {
    await executeQuery(sqlQueries.updateHeroSlide, [row, id]);
  }

  async deleteHeroSlide(id) {
    await executeQuery(sqlQueries.deleteHeroSlide, [id]);
  }

  /* ================= HEALTH ================= */
  async ping() {
    await executeQuery(sqlQueries.ping);
  }
}

module.exports = new Cmds();
