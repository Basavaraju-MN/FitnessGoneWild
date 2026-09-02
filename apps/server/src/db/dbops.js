const { executeQuery } = require('./connection');
const sqlQueries = require('../db/sqlqueries');

class Cmds {

  async getTrekCategories() {
    const rows = await executeQuery(sqlQueries.getTrekCategories);
    if (rows.length === 0) {
      throw utils.getErrorObject(
        'Trek categories not found',
        appConstants.HTTP_STATUS_CODES.NOT_FOUND,
        'Error in getTrekCategories - no categories found',
        appConstants.HTTP_STATUS_CODES.ZERO_ROWS
      );
    }
    return rows;
  }

  async getTrekDetails(categoryId) {
    const rows = await executeQuery(sqlQueries.getTrekDetails, [categoryId]);
    return rows || [];
  }

  async getFeaturedTrips() {
    const rows = await executeQuery(sqlQueries.getFeaturedTrips);
    return rows || [];
  }

  async createTripInterest({ trip_id, type = 'interested', source = 'website' }) {
    if (!trip_id) {
      throw new Error('trip_id is required');
    }

    const result = await executeQuery(sqlQueries.createTripInterest, [trip_id, type, source]);
    return result || [];
  }

  async createCustomer({ name, phone, email = null, city = null }) {
    if (!name || !phone) {
      throw new Error('name and phone are required');
    }

    const result = await executeQuery(sqlQueries.createCustomer, [
      name,
      phone,
      email || null,
      city || null,
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
    if (rows.length === 0) {
      throw utils.getErrorObject(
        'Trek details not found',
        appConstants.HTTP_STATUS_CODES.NOT_FOUND,
        'Error in getTrekDetails - no details found',
        appConstants.HTTP_STATUS_CODES.ZERO_ROWS
      );
    }
    return rows[0];
  }

  async updateDownloadCount(trip_id) {
    await executeQuery(sqlQueries.updateDownloadCount, [trip_id]);
  }

}
module.exports = new Cmds();
