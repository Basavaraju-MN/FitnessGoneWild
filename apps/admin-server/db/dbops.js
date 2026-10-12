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
      brochureCounts, revenue, upcoming, activity,
    ] = await Promise.all([
      executeQuery(sqlQueries.dashboardBookingTotals).then(first),
      executeQuery(sqlQueries.dashboardCustomerCount).then(first),
      executeQuery(sqlQueries.dashboardUpcomingCounts).then(first),
      executeQuery(sqlQueries.dashboardEnquiryCounts).then(first),
      executeQuery(sqlQueries.dashboardBrochureCounts).then(first),
      executeQuery(sqlQueries.dashboardRevenueByMonth),
      executeQuery(sqlQueries.dashboardUpcomingDepartures),
      executeQuery(sqlQueries.dashboardActivity),
    ]);

    return {
      bookingTotals, customerCount, upcomingCounts, enquiryCounts,
      brochureCounts, revenue, upcoming, activity,
    };
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
    const [trips, categories, guides, vehicles, drivers, pickupPoints, users] = await Promise.all([
      executeQuery(sqlQueries.lookupTrips),
      executeQuery(sqlQueries.lookupCategories),
      executeQuery(sqlQueries.lookupGuides),
      executeQuery(sqlQueries.lookupVehicles),
      executeQuery(sqlQueries.lookupDrivers),
      executeQuery(sqlQueries.lookupPickupPoints),
      executeQuery(sqlQueries.lookupUsers),
    ]);

    return { trips, categories, guides, vehicles, drivers, pickupPoints, users };
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
    const [bookings, downloads, enquiries] = await Promise.all([
      executeQuery(sqlQueries.getCustomerBookings, [customer.id]),
      executeQuery(sqlQueries.getCustomerDownloads, [customer.id, customer.phone]),
      executeQuery(sqlQueries.getCustomerEnquiries, [customer.id, customer.phone]),
    ]);
    return { bookings, downloads, enquiries };
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

  /* ================= BROCHURE DOWNLOADS ================= */
  async getBrochureDownloads() {
    const [rows, stats] = await Promise.all([
      executeQuery(sqlQueries.getBrochureDownloads),
      executeQuery(sqlQueries.getBrochureDownloadStats).then(first),
    ]);
    return { rows, stats };
  }

  async updateBrochureDownload(id, data) {
    return (await executeQuery(sqlQueries.updateBrochureDownload, [data, id])).affectedRows;
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

  /* ================= HEALTH ================= */
  async ping() {
    await executeQuery(sqlQueries.ping);
  }
}

module.exports = new Cmds();
