const dbops = require('../../db/dbops');
const ftpBrochure = require('./ftpBrochure');
const { sendBrochureDownloadAlert } = require('../../utils/mail');

// Brochure PDFs are kept only on Hostinger (File Manager → public_html/public/brochures),
// one folder per trek named by its slug, read over FTP:
//   public/brochures/kudremukh/Kudremukha trek.pdf   or   public/brochures/kudremukh.pdf
// Nothing is stored on the website server or in the database.

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

    const trip = await dbops.getTripById(trip_id);

    if (!trip) {
        return {
            success: false,
            statusCode: 404,
            message: 'Trek not found',
        };
    }

    if (!ftpBrochure.isConfigured()) {
        console.error('Brochure: HOSTINGER_FTP_HOST / USER / PASSWORD are not set');
        return {
            success: false,
            statusCode: 503,
            message: 'Brochures are not available right now. Please try again later.',
        };
    }

    // The PDF on Hostinger, looked up fresh (a renamed or removed file shows at once)
    const onFtp = await ftpBrochure.findBrochure(trip.slug, { fresh: true });

    if (!onFtp) {
        return {
            success: false,
            statusCode: 404,
            message: 'Brochure not found',
        };
    }

    // Save the lead (Enquiries & Leads) with the trip whose brochure they
    // downloaded. Every download adds a row, so repeat downloads are kept.
    // They become a customer only when they book (bookingDbops.recordBooking).
    try {
        const customerId = await dbops.findCustomerIdByPhone(phone);
        await dbops.createBrochureLead({ customer_id: customerId, trip_id, name, phone, email });
    } catch (error) {
        return {
            success: false,
            statusCode: 500,
            message: error.message || 'Unable to save your details',
        };
    }

    // Email the admin in the background; the download does not wait for it
    sendBrochureDownloadAlert({ name, phone, email, tripName: trip.name });

    // The count is nice to have; never block the download for it
    try {
        await dbops.countBrochureDownload(trip_id, `${trip.name}.pdf`);
    } catch (error) {
        console.error('Brochure download count failed:', error?.message || error);
    }

    return {
        success: true,
        data: {
            fileName: `${trip.name}.pdf`,
            mimeType: 'application/pdf',
            ftpSlug: trip.slug,
        },
    };
}

module.exports = {
    getBrochure,
};
