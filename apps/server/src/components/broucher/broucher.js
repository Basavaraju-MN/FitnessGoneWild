const dbops = require('../../db/dbops');

async function getBrochure(trip_id) {
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