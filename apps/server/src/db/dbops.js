const { executeQuery } = require('./connection');
const sqlQueries = require('../db/sqlqueries');

// A departure leaving today can still be booked until 10 PM India time;
// after that the first bookable date is tomorrow. YYYY-MM-DD (India).
const BOOK_TODAY_UNTIL_HOUR = 22;
function firstBookableDate(now = new Date()) {
  const india = new Date(now.getTime() + 5.5 * 3600 * 1000);
  if (india.getUTCHours() >= BOOK_TODAY_UNTIL_HOUR) india.setUTCDate(india.getUTCDate() + 1);
  return india.toISOString().slice(0, 10);
}

class Cmds {

  async getTrekCategories() {
    const rows = await executeQuery(sqlQueries.getTrekCategories);
    return rows || [];
  }

  async getTrekDetails(categoryId) {
    const rows = await executeQuery(sqlQueries.getTrekDetails, [categoryId]);
    return rows || [];
  }

  async getTrekBySlug(slug) {
    if (!/^[a-z0-9_-]{1,80}$/i.test(String(slug || ''))) return null;
    const rows = await executeQuery(sqlQueries.getTrekBySlug, [slug]);
    return rows?.[0] || null;
  }

  async getFeaturedTrips() {
    const rows = await executeQuery(sqlQueries.getFeaturedTrips);
    return rows || [];
  }

  async getTripTerms(tripId) {
    const [sections, meta] = await Promise.all([
      executeQuery(sqlQueries.getTripTerms, [tripId]),
      executeQuery(sqlQueries.getTripTermsHighlights, [tripId]),
    ]);
    return { sections: sections || [], highlights: meta?.[0]?.terms_highlights || '' };
  }

  async getRegions() {
    return (await executeQuery(sqlQueries.getRegions)) || [];
  }

  async getRegionCategories() {
    return (await executeQuery(sqlQueries.getRegionCategories)) || [];
  }

  async getDepartureCities() {
    return (await executeQuery(sqlQueries.getDepartureCities)) || [];
  }

  async getTripPlaces() {
    return (await executeQuery(sqlQueries.getTripPlaces)) || [];
  }

  async getPickupCities(tripId) {
    return (await executeQuery(sqlQueries.getPickupCities, [tripId])) || [];
  }

  async getTrekDates(tripId) {
    return (await executeQuery(sqlQueries.getTrekDates, [tripId, firstBookableDate()])) || [];
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

  async getHero() {
    const [settings, slides] = await Promise.all([
      executeQuery(sqlQueries.getHeroSettings),
      executeQuery(sqlQueries.getHeroSlides),
    ]);
    return { settings: settings?.[0] || null, slides: slides || [] };
  }

  /* ---------- Coupons ---------- */
  // Coupon by code, with the treks it is for (trip_ids), or null
  async getCouponByCode(code) {
    const coupon = (await executeQuery(sqlQueries.getCouponByCode, [code]))?.[0];
    if (!coupon) return null;
    const trips = await executeQuery(sqlQueries.getCouponTripIds, [coupon.id]);
    return { ...coupon, trip_ids: trips.map((t) => t.trip_id) };
  }

  async getPublicCouponsForTrip(tripId) {
    return (await executeQuery(sqlQueries.getPublicCouponsForTrip, [tripId])) || [];
  }

  async getTripForPricing(tripId) {
    return (await executeQuery(sqlQueries.getTripForPricing, [tripId]))?.[0] || null;
  }

  // trip id -> its active price options [{ id, label, price }].
  // Empty until trip_price_options.sql has run (treks keep with / without transport).
  async getPriceOptionsByTrip(tripIds) {
    const ids = [...new Set(tripIds.map(Number).filter(Boolean))];
    const byTrip = new Map();
    if (!ids.length) return byTrip;
    let rows = [];
    try {
      rows = (await executeQuery(sqlQueries.getPriceOptionsForTrips, [ids])) || [];
    } catch (error) {
      if (!['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code)) throw error;
    }
    for (const row of rows) {
      const option = { id: row.id, label: row.label, price: Number(row.price) };
      byTrip.set(row.trip_id, [...(byTrip.get(row.trip_id) || []), option]);
    }
    return byTrip;
  }

  async getTripPriceOptions(tripId) {
    return (await this.getPriceOptionsByTrip([tripId])).get(Number(tripId)) || [];
  }

  // One hero's photo { mime, data } from the database, or null
  async getHeroPhoto(heroId) {
    const rows = await executeQuery(sqlQueries.getHeroPhoto, [heroId]);
    return rows?.[0] || null;
  }

  async getHeroesWithFilePhotos() {
    return executeQuery(sqlQueries.getHeroesWithFilePhotos);
  }

  async saveHeroPhoto(heroId, mime, buffer) {
    await executeQuery(sqlQueries.saveHeroPhoto, [heroId, mime, buffer]);
  }

  async setHeroImagePath(heroId, imagePath) {
    await executeQuery(sqlQueries.setHeroImagePath, [imagePath, heroId]);
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
