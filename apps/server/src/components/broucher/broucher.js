const fs = require('fs');
const path = require('path');

const dbops = require('../../db/dbops');

// Brochure PDFs live on disk, one folder per trek named by its slug:
//   apps/server/brochures/<slug>/<any name>.pdf
//   e.g. brochures/kudremukh/Kudremukh Peak Trek (2D 1N).pdf
// The PDF's own file name is used as the download name.
// Not a public folder, so a file is only sent after the lead form.
const BROCHURE_DIR = path.resolve(__dirname, '../../../brochures');

// The trek's brochure PDF { filePath, fileName }, or null when none.
function findBrochureFile(slug) {
    // Slugs are simple names; anything else could point outside the folder
    if (!/^[a-z0-9_-]+$/i.test(String(slug || ''))) {
        return null;
    }

    const folder = path.join(BROCHURE_DIR, slug);

    let pdfs = [];
    try {
        pdfs = fs
            .readdirSync(folder, { withFileTypes: true })
            .filter((entry) => entry.isFile() && /\.pdf$/i.test(entry.name))
            .map((entry) => entry.name)
            .sort();
    } catch {
        return null; // no folder for this trek
    }

    if (pdfs.length === 0) return null;

    if (pdfs.length > 1) {
        console.warn(
            `More than one brochure PDF in brochures/${slug}; using "${pdfs[0]}"`
        );
    }

    return {
        filePath: path.join(folder, pdfs[0]),
        fileName: pdfs[0],
    };
}

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

    // 1. PDF in the trek's brochures folder (preferred)
    const brochureFile = findBrochureFile(trip.slug);

    // 2. Older brochures still stored in the database
    const storedBrochure = brochureFile
        ? null
        : await dbops.getBrochureById(trip_id);

    if (!brochureFile && !storedBrochure?.file_data) {
        return {
            success: false,
            statusCode: 404,
            message: 'Brochure not found',
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

    // The count is nice to have; never block the download for it
    try {
        await dbops.countBrochureDownload(trip_id, `${trip.name}.pdf`);
    } catch (error) {
        console.error('Brochure download count failed:', error?.message || error);
    }

    return {
        success: true,
        data: {
            fileName:
                brochureFile?.fileName ||
                storedBrochure?.file_name ||
                `${trip.name}.pdf`,
            mimeType: storedBrochure?.mime_type || 'application/pdf',
            filePath: brochureFile?.filePath || null,
            fileData: storedBrochure?.file_data || null,
        },
    };
}

module.exports = {
    getBrochure,
};
