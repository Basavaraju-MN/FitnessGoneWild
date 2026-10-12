const { query } = require('../db');
const { ok, badRequest, logActivity } = require('../utils/http');

exports.list = async (req, res) => {
  ok(res, await query('SELECT setting_key, setting_value, label, updated_at FROM settings ORDER BY label'));
};

// Body: { settings: { key: value, ... } } — only existing keys are updated
exports.update = async (req, res) => {
  const settings = req.body?.settings;
  if (!settings || typeof settings !== 'object') throw badRequest('Nothing to save');

  const keys = Object.keys(settings);
  for (const key of keys) {
    await query('UPDATE settings SET setting_value = ? WHERE setting_key = ?', [
      String(settings[key] ?? '').slice(0, 500),
      key,
    ]);
  }

  await logActivity(req, 'update', 'settings', null, keys.join(', '));
  ok(res, true);
};
