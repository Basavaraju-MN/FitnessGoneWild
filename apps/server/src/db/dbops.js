const { executeQuery } = require('./connection');
const sqlQueries = require('../db/sqlqueries');

class Cmds {

  async getTrekCategories() {
    const rows = await executeQuery(sqlQueries.getTrekCategories);
    if (rows.length === 0) {
      throw utils.getErrorObject(
        'Trek categories not found',
        appConstants.HTTP_STATUS_CODES.NOT_FOUND,
        'Error in getTrekCategories - no categories found',
        appConstants.HTTP_STATUS_CODES.ZERO_ROWS
      );
    }
    return rows;
  }

  async getTrekDetails(categoryId) {
    const rows = await executeQuery(sqlQueries.getTrekDetails, [categoryId]);
    if (rows.length === 0) {
      throw utils.getErrorObject(
        'Trek details not found',
        appConstants.HTTP_STATUS_CODES.NOT_FOUND,
        'Error in getTrekDetails - no details found',
        appConstants.HTTP_STATUS_CODES.ZERO_ROWS
      );
    }
    return rows;
  }
}
module.exports = new Cmds();