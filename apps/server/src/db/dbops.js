const { executeQuery } = require('./connection');
const sqlQueries = require('../db/sqlqueries');

class Cmds {

  async getTrekDetails() {
    const rows = await executeQuery(sqlQueries.getTrekDetails);
    if (rows.length === 0) {
      throw utils.getErrorObject(
        'User Not found or invalid passwd',
        appConstants.HTTP_STATUS_CODES.NOT_FOUND,
        'Error in verifyPasswd - user not found or invalid credentails',
        appConstants.HTTP_STATUS_CODES.ZERO_ROWS
      );
    }
    return rows;
  }
}
module.exports = new Cmds();