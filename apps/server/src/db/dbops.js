const { executeQuery } = require('./connection');
const sqlQueries = require('../db/sqlqueries');

class Cmds {

  async getTrekCategories() {
    const rows = await executeQuery(sqlQueries.getTrekCategories);
    return rows || [];
  }

  async getTrekDetails(categoryId) {
    const rows = await executeQuery(sqlQueries.getTrekDetails, [categoryId]);
    return rows || [];
  }

  async getFeaturedTrips() {
    const rows = await executeQuery(sqlQueries.getFeaturedTrips);
    return rows || [];
  }

  async getPickupPoints(tripId) {
    const rows = await executeQuery(sqlQueries.getPickupPoints, [tripId]);
    return rows || [];
  }

  async createTripInterest({ trip_id, type = 'interested', source = 'website' }) {
    if (!trip_id) {
      throw new Error('trip_id is required');
    }

    const result = await executeQuery(sqlQueries.createTripInterest, [trip_id, type, source]);
    return result || [];
  }

  async createCustomer({ name, phone, email = null, city = null, trip_id = null }) {
    if (!name || !phone) {
      throw new Error('name and phone are required');
    }

    const result = await executeQuery(sqlQueries.createCustomer, [
      name,
      phone,
      email || null,
      city || null,
      trip_id || null,
    ]);

    return result || [];
  }

  async getReviews() {
    const rows = await executeQuery(sqlQueries.getReviews);
    return rows || [];
  }

  async getWhyUs() {
    const rows = await executeQuery(sqlQueries.getWhyUs);
    return rows || [];
  }

  async getFaq() {
    const rows = await executeQuery(sqlQueries.getFaq);
    return rows || [];
  }

  async getBrochureById(trip_id) {
    const rows = await executeQuery(sqlQueries.downloadBroucher, [trip_id]);
    return rows[0] || null;
  }

  async updateDownloadCount(trip_id) {
    await executeQuery(sqlQueries.updateDownloadCount, [trip_id]);
  }

  // Lead in the admin portal's Enquiries & Leads (source: brochure)
  async createBrochureLead({ customer_id, trip_id, name, phone, email = null }) {
    await executeQuery(sqlQueries.createBrochureLead, [customer_id || null, trip_id, name, phone, email || null]);
  }

  async findCustomerIdByPhone(phone) {
    const rows = await executeQuery(sqlQueries.findCustomerIdByPhone, [phone]);
    return rows?.[0]?.id || null;
  }

  async countTripInterested(trip_id) {
    const rows = await executeQuery(sqlQueries.countTripInterested, [trip_id]);
    return Number(rows[0]?.total || 0);
  }

  async getTripById(trip_id) {
    const rows = await executeQuery(sqlQueries.getTripById, [trip_id]);
    return rows[0] || null;
  }

  async countBrochureDownload(trip_id, fileName) {
    await executeQuery(sqlQueries.countBrochureDownload, [trip_id, fileName]);
  }

}
module.exports = new Cmds();
