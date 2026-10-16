// Trip codes for trip coordinations (departures.trip_code), e.g. TC-0001.
// A trip gets its code when its first customer booking is added (admin or
// website), from the pattern in Settings: trip_code_prefix + trip_code_digits.
// The admin can change a code later (any unique text).
const { executeQuery } = require('../../db/connection');

const queries = {
  settings: "SELECT setting_key, setting_value FROM settings WHERE setting_key IN ('trip_code_prefix', 'trip_code_digits')",
  current: 'SELECT trip_code FROM departures WHERE id = ?',
  sameprefix: 'SELECT trip_code FROM departures WHERE trip_code LIKE ?',
  set: 'UPDATE departures SET trip_code = ? WHERE id = ? AND trip_code IS NULL',
  // Trips with bookings but no code yet (made before codes existed)
  missing: `SELECT DISTINCT d.id FROM departures d
            JOIN bookings b ON b.departure_id = d.id AND b.status <> 'cancelled'
            WHERE d.trip_code IS NULL ORDER BY d.id`,
};

async function pattern() {
  const rows = await executeQuery(queries.settings);
  const s = Object.fromEntries((rows || []).map((r) => [r.setting_key, r.setting_value]));
  const prefix = String(s.trip_code_prefix || 'TC').trim().replace(/[^A-Za-z0-9_/-]/g, '') || 'TC';
  const digits = Math.min(8, Math.max(1, Number(s.trip_code_digits) || 4));
  return { prefix, digits };
}

// Next free code for the prefix: highest number used so far + 1
async function nextCode() {
  const { prefix, digits } = await pattern();
  const rows = await executeQuery(queries.sameprefix, [`${prefix}-%`]);
  const used = (rows || [])
    .map((r) => new RegExp(`^${prefix.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}-(\\d+)$`, 'i').exec(r.trip_code)?.[1])
    .filter(Boolean)
    .map(Number);
  const next = (used.length ? Math.max(...used) : 0) + 1;
  return `${prefix}-${String(next).padStart(digits, '0')}`;
}

/**
 * Gives the trip a code if it has none yet. Safe to call on every booking:
 * a trip that already has a code (default or typed) keeps it.
 */
async function ensureTripCode(departureId) {
  if (!departureId) return null;
  const existing = (await executeQuery(queries.current, [departureId]))?.[0];
  if (!existing) return null;
  if (existing.trip_code) return existing.trip_code;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const code = await nextCode();
    try {
      await executeQuery(queries.set, [code, departureId]);
      return (await executeQuery(queries.current, [departureId]))?.[0]?.trip_code || code;
    } catch (error) {
      if (error?.code !== 'ER_DUP_ENTRY') throw error; // taken at the same moment: try the next one
    }
  }
  return null;
}

// Codes for trips that already had bookings before codes existed
async function fillMissingTripCodes() {
  for (const row of (await executeQuery(queries.missing)) || []) {
    await ensureTripCode(row.id);
  }
}

module.exports = { ensureTripCode, fillMissingTripCodes, nextCode };
