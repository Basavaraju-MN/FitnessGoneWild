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

    try {
        await dbops.createCustomer({ name, phone, email, city });
    } catch (error) {
        return {
            success: false,
            statusCode: 500,
            message: error.message || 'Unable to save customer details',
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