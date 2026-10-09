const dbCmds = require('../db/dbops');

const getTrekCategories = async () => {
    const result = {};
    try {
        const data = await dbCmds.getTrekCategories();
        result.success = true;
        result.message = 'Trek categories fetched successfully';
        result.data = data;
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching trek categories';
        console.error('Error fetching trek categories:', error?.message || error);
    }
    return result;
}

const getTrekDetails = async (categoryId) => {
    const result = {};
    try {
        const data = await dbCmds.getTrekDetails(categoryId);
        result.success = true;
        result.message = 'Trek details fetched successfully';
        result.data = data;
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching trek details';
        console.error('Error fetching trek details:', error?.message || error);
    }
    return result;
}

const getFeaturedTrips = async () => {
    const result = {};
    try {
        const data = await dbCmds.getFeaturedTrips();
        result.success = true;
        result.message = 'Featured trips fetched successfully';
        result.data = data;
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching featured trips';
        console.error('Error fetching featured trips:', error?.message || error);
    }
    return result;
}

const getReviews = async () => {
    const result = {};
    try {
        const data = await dbCmds.getReviews();
        result.success = true;
        result.message = 'Reviews fetched successfully';
        result.data = data;
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching reviews';
        console.error('Error fetching reviews:', error?.message || error);
    }
    return result;
}

const getWhyUs = async () => {
    const result = {};
    try {
        const data = await dbCmds.getWhyUs();
        result.success = true;
        result.message = 'Why us items fetched successfully';
        result.data = data;
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching why us items';
        console.error('Error fetching why us items:', error?.message || error);
    }
    return result;
}

const getFaq = async () => {
    const result = {};
    try {
        const data = await dbCmds.getFaq();
        result.success = true;
        result.message = 'FAQ items fetched successfully';
        result.data = data;
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching FAQ items';
        console.error('Error fetching FAQ items:', error?.message || error);
    }
    return result;
}

const createTripInterest = async ({ trip_id, type = 'interested', source = 'website' }) => {
    const result = {};
    try {
        const data = await dbCmds.createTripInterest({ trip_id, type, source });
        result.success = true;
        result.message = 'Trip interest saved successfully';
        result.data = { trip_id, type, source, insertId: data?.insertId || null };
    } catch (error) {
        result.success = false;
        result.message = 'Error saving trip interest';
    }
    return result;
}

const getPickupPoints = async (tripId) => {
    const result = {};
    try {
        const data = await dbCmds.getPickupPoints(tripId);
        result.success = true;
        result.message = 'Pickup points fetched successfully';
        result.data = data;
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching pickup points';
        console.error('Error fetching pickup points:', error?.message || error);
    }
    return result;
}

module.exports = {
    getPickupPoints,
    getTrekCategories,
    getTrekDetails,
    getFeaturedTrips,
    getReviews,
    getWhyUs,
    getFaq,
    createTripInterest
};
