// Trip Coordination screen (departures: trek + dates + team).
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const {
  badRequest,
  notFound,
  pick,
  requireFields,
  isDate,
  logActivity,
} = require('../../utils/http');

const DEPARTURE_FIELDS = [
  'trip_id', 'start_date', 'end_date', 'departure_type', 'seats_total',
  'status', 'guide_id', 'trip_status',
  'price_override', 'notes',
];

function cleanDeparture(body) {
  const data = pick(body, DEPARTURE_FIELDS);

  for (const key of ['start_date', 'end_date']) {
    if (data[key] !== undefined && data[key] !== null && !isDate(data[key])) {
      throw badRequest(`${key} must be YYYY-MM-DD`);
    }
  }

  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    throw badRequest('Return date cannot be before the travel date');
  }

  return data;
}

const getDepartures = ({ when, tripId }) => dbops.getDepartures({ when: when || 'upcoming', tripId });

async function getDeparture(id) {
  const departure = await dbops.getDepartureById(id);
  if (!departure) throw notFound('Trip coordination not found');

  const customers = await dbops.getDepartureCustomers(id);
  return { ...departure, customers };
}

async function createDeparture(admin, body) {
  requireFields(body, ['trip_id', 'start_date']);
  const data = cleanDeparture(body);
  data.end_date = data.end_date || data.start_date;
  data.departure_type = data.departure_type || 'scheduled';

  const existing = await dbops.findDeparture(data);
  if (existing) throw badRequest(`This trip already has a coordination for these dates (#${existing.id})`);

  const id = await dbops.createDeparture(data);
  await logActivity(admin, 'create', 'departure', id, `${data.start_date} → ${data.end_date}`);
  return { id };
}

async function updateDeparture(admin, id, body) {
  const data = cleanDeparture(body);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  if (!(await dbops.updateDeparture(id, data))) throw notFound('Trip coordination not found');

  await logActivity(admin, 'update', 'departure', id, Object.keys(data).join(', '));
  return { id };
}

module.exports = {
  getDepartures,
  getDeparture,
  createDeparture,
  updateDeparture,
};
