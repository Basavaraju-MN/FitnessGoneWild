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

module.exports = {
    getTrekCategories,
    getTrekDetails
};
