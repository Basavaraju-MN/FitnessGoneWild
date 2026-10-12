// Small lists used by dropdowns across the admin.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');

const getLookups = () => dbops.getLookups();

module.exports = {
  getLookups,
};
