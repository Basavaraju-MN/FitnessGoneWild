// Settings screen.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const {
  badRequest,
  logActivity,
} = require('../../utils/http');

const getSettings = () => dbops.getSettings();

// settings: { key: value } — only existing keys are updated
async function updateSettings(admin, settings) {
  if (!settings || typeof settings !== 'object') throw badRequest('Nothing to save');

  const keys = Object.keys(settings);
  for (const key of keys) {
    await dbops.updateSetting(key, String(settings[key] ?? '').slice(0, 500));
  }

  await logActivity(admin, 'update', 'settings', null, keys.join(', '));
  return true;
}

module.exports = {
  getSettings,
  updateSettings,
};
