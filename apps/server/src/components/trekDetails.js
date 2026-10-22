const dbCmds = require('../db/dbops');
const { sendTripInterestAlert } = require('../utils/mail');

// Regions / departure cities are newer tables: until the database has them
// (regions_cities.sql), the website works as before without them.
const isMissingSchema = (error) => ['ER_NO_SUCH_TABLE', 'ER_BAD_FIELD_ERROR'].includes(error?.code);

// trip id -> { region: {id, slug, name} | null, departure_cities: [{id, name}] }
// A trek with no pickup points yet leaves from the first city (Bangalore).
async function getPlaces() {
    try {
        const [rows, cityList] = await Promise.all([dbCmds.getTripPlaces(), dbCmds.getDepartureCities()]);
        const firstCity = cityList[0] ? [{ id: cityList[0].id, name: cityList[0].name }] : [];
        const parseCities = (text) => String(text || '')
            .split('|')
            .filter(Boolean)
            .map((item) => {
                const at = item.indexOf(':');
                return { id: Number(item.slice(0, at)), name: item.slice(at + 1) };
            });
        return new Map(rows.map((row) => [row.trip_id, {
            row,
            region: row.region_id ? { id: row.region_id, slug: row.region_slug, name: row.region_name } : null,
            departure_cities: row.cities ? parseCities(row.cities) : firstCity,
        }]));
    } catch (error) {
        if (!isMissingSchema(error)) console.error('Error fetching trek places:', error?.message || error);
        return new Map();
    }
}

// Adds region and departure_cities to each trek
async function withPlaces(trips) {
    const places = await getPlaces();
    return trips.map((trip) => {
        const place = places.get(trip.id);
        return { ...trip, region: place?.region || null, departure_cities: place?.departure_cities || [] };
    });
}

// Website filters: regions and cities, each with how many treks it has
const getSiteFilters = async () => {
    const result = {};
    try {
        let regions = [];
        let cities = [];
        try {
            [regions, cities] = await Promise.all([dbCmds.getRegions(), dbCmds.getDepartureCities()]);
        } catch (error) {
            if (!isMissingSchema(error)) throw error;
        }
        // Category tabs per region (none set = every category)
        let regionCategories = [];
        try {
            regionCategories = await dbCmds.getRegionCategories();
        } catch (error) {
            if (!isMissingSchema(error)) throw error;
        }
        const places = [...(await getPlaces()).values()];
        result.success = true;
        result.data = {
            regions: regions.map((region) => ({
                ...region,
                trek_count: places.filter((p) => p.region?.id === region.id).length,
                category_ids: regionCategories.filter((rc) => rc.region_id === region.id).map((rc) => rc.category_id),
                city_ids: [...new Set(places
                    .filter((p) => p.region?.id === region.id)
                    .flatMap((p) => p.departure_cities.map((c) => c.id)))],
            })),
            // One row per trek, so the website can count treks per tab / region / city
            treks: places.map((p) => ({
                id: p.row.trip_id,
                category_id: p.row.category_id,
                is_featured: Number(p.row.is_featured) === 1,
                region_id: p.region?.id || null,
                city_ids: p.departure_cities.map((c) => c.id),
            })),
            cities: cities.map((city) => ({
                ...city,
                trek_count: places.filter((p) => p.departure_cities.some((c) => c.id === city.id)).length,
            })),
        };
    } catch (error) {
        result.success = false;
        result.message = 'Error fetching site filters';
        console.error('Error fetching site filters:', error?.message || error);
    }
    return result;
};

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
        const data = await withPlaces(await dbCmds.getTrekDetails(categoryId));
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
        const data = await withPlaces(await dbCmds.getFeaturedTrips());
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

const getPickupPoints = async (tripId) => {
    const result = {};
    try {
        const points = await dbCmds.getPickupPoints(tripId);
        // The city of each pickup point (for the city filter in booking)
        let cities = new Map();
        try {
            cities = new Map((await dbCmds.getPickupCities(tripId)).map((row) => [row.id, row]));
        } catch (error) {
            if (!isMissingSchema(error)) throw error;
        }
        const data = points.map((point) => ({
            ...point,
            city_id: cities.get(point.id)?.city_id || null,
            city_name: cities.get(point.id)?.city_name || null,
        }));
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
    getSiteFilters,
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
