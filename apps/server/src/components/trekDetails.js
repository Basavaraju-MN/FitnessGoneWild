const dbCmds = require('../db/dbops');

const getTrekDetails = async () => {
    const result = {};
    try {
        const data = await dbCmds.getTrekDetails();
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
    getTrekDetails
};
