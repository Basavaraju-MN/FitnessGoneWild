// Bell alerts — each role sees only its own kinds of alert.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const {
  modulesForRole,
} = require('../common/rules');

const NOTIFICATION_FEEDS = {
  booking: 'bookings', // feed: module needed to see it
  brochure: 'enquiries',
  interest: 'enquiries',
};

async function getNotifications(admin) {
  const modules = modulesForRole(admin.role);
  const types = Object.keys(NOTIFICATION_FEEDS).filter((type) => modules.includes(NOTIFICATION_FEEDS[type]));

  const feeds = await Promise.all(types.map(async (type) => [type, await dbops.getNotificationFeed(type)]));
  return Object.fromEntries(feeds);
}

module.exports = {
  getNotifications,
};
