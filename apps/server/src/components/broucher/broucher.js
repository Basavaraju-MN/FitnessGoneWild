const dbops = require('../../db/dbops');

async function getBrochure({ trip_id, name, phone, email = null, city = null }) {
    if (!trip_id) {
        return {
            success: false,
            statusCode: 400,
            message: 'Trip ID is required',
        };
    }

    if (!name || !phone) {
        return {
            success: false,
            statusCode: 400,
            message: 'Name and phone are required',
        };
    }

    const brochure = await dbops.getBrochureById(
        trip_id
    );

    if (!brochure) {
        return {
            success: false,
            statusCode: 404,
            message: 'Brochure not found',
        };
    }

    if (!brochure.file_data) {
        return {
            success: false,
            statusCode: 404,
            message: 'Brochure file not found',
        };
    }

    // Save the lead with the trip whose brochure they downloaded.
    // Every download adds a new row, so repeat downloads are kept.
    try {
        await dbops.createCustomer({ name, phone, email, city, trip_id });
    } catch (error) {
        return {
            success: false,
            statusCode: 500,
            message: error.message || 'Unable to save customer details',
        };
    }

    await dbops.updateDownloadCount(
        trip_id
    );

    return {
        success: true,
        data: brochure,
    };
}

module.exports = {
    getBrochure,
};
