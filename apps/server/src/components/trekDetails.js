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

module.exports = {
    getTrekCategories,
    getTrekDetails,
    getFeaturedTrips,
    getReviews,
    getWhyUs,
    getFaq,
    createTripInterest
};
