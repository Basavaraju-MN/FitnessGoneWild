const dbCmds = require('../db/dbops');
const { sendTripInterestAlert } = require('../utils/mail');

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

// One trek for its own page (/treks/<slug>)
const getTrekBySlug = async (slug) => {
    const result = {};
    try {
        result.data = await dbCmds.getTrekBySlug(slug);
        result.success = true;
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching trek';
        console.error('Error fetching trek:', error?.message || error);
    }
    return result;
};

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

// Home page hero; facts are stored as JSON text
const getHero = async () => {
    const result = {};
    try {
        const { settings, slides } = await dbCmds.getHero();
        const parse = (raw) => { try { const list = JSON.parse(raw || '[]'); return Array.isArray(list) ? list : []; } catch { return []; } };
        result.success = true;
        result.data = {
            slide_seconds: settings?.slide_seconds || 4,
            heroes: slides.map((slide) => ({ ...slide, facts: parse(slide.facts) })),
        };
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching hero';
        console.error('Error fetching hero:', error?.message || error);
    }
    return result;
};

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

async function notifyInterest(tripId) {
    try {
        const [trip, total] = await Promise.all([
            dbCmds.getTripById(tripId),
            dbCmds.countTripInterested(tripId),
        ]);
        if (trip) await sendTripInterestAlert({ tripId, tripName: trip.name, total });
    } catch (error) {
        console.error('Interest alert failed:', error?.message || error);
    }
}

const createTripInterest = async ({ trip_id, type = 'interested', source = 'website' }) => {
    const result = {};
    try {
        const data = await dbCmds.createTripInterest({ trip_id, type, source });
        result.success = true;
        result.message = 'Trip interest saved successfully';
        result.data = { trip_id, type, source, insertId: data?.insertId || null };

        // Tell the admin by email (in the background, never blocks the click)
        if (type === 'interested') {
            notifyInterest(trip_id);
        }
    } catch (error) {
        result.success = false;
        result.message = 'Error saving trip interest';
    }
    return result;
}

// A trek's terms: key points (chips) and sections (heading + rich text).
// Empty until trip_terms.sql has run on the database.
const getTripTerms = async (tripId) => {
    const result = {};
    try {
        const { sections, highlights } = await dbCmds.getTripTerms(tripId);
        const updated = sections.reduce((latest, s) => (s.updated_at > latest ? s.updated_at : latest), '');
        result.success = true;
        result.data = {
            highlights: String(highlights || '').split('\n').map((line) => line.trim()).filter(Boolean),
            sections: sections.map((s) => ({ id: s.id, title: s.title, body: s.body })),
            updated_at: updated || null,
        };
    } catch (error) {
        if (['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code)) {
            result.success = true;
            result.data = { highlights: [], sections: [], updated_at: null };
        } else {
            result.success = false;
            result.message = 'Error fetching trek terms';
            console.error('Error fetching trek terms:', error?.message || error);
        }
    }
    return result;
};

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
    getTrekBySlug,
    getTripTerms,
    getPickupPoints,
    getTrekCategories,
    getTrekDetails,
    getFeaturedTrips,
    getReviews,
    getHero,
    getWhyUs,
    getFaq,
    createTripInterest
};
