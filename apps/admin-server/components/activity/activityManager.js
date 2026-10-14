// Activity Log screen (admin only): business activity + admin actions.
// Called by controller/controller.js; reads through db/dbops.js.
const dbops = require('../../db/dbops');

// type=admin: what users did in the portal; otherwise the business feed
const getActivity = (type) => (type === 'admin' ? dbops.getActivityLog() : dbops.getActivityFeed());

module.exports = {
  getActivity,
};
