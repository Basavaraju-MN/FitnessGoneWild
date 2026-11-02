// Trip Coordination screen (departures: trek + dates + team).
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const tripCode = require('../../../server/src/components/trip/tripCode');
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
  'price_override', 'notes', 'trip_code',
];

// open = the website takes bookings for this date; full = shown as sold out
const DEPARTURE_STATUSES = ['open', 'full', 'cancelled', 'completed'];

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

  // Seats: empty = keep as it is (a new trip gets the table default)
  if (data.seats_total === '' || data.seats_total === null) delete data.seats_total;
  if (data.seats_total !== undefined) {
    const seats = Number(data.seats_total);
    if (!Number.isInteger(seats) || seats < 1 || seats > 999) throw badRequest('Seats must be a whole number from 1 to 999');
    data.seats_total = seats;
  }

  // Booking on the website: open, or sold out (full)
  if (data.status === '' || data.status === null) delete data.status;
  if (data.status !== undefined && !DEPARTURE_STATUSES.includes(data.status)) {
    throw badRequest('Unknown booking status');
  }

  // Trip code: your own numbering (letters, numbers, - _ /); empty = none yet
  if (data.trip_code !== undefined) {
    const code = String(data.trip_code ?? '').trim().toUpperCase();
    if (code && !/^[A-Z0-9][A-Z0-9 _/-]{0,29}$/.test(code)) {
      throw badRequest('Trip code: use letters, numbers, spaces, - _ or / (up to 30)');
    }
    data.trip_code = code || null;
  }

  return data;
}

// Trips that already had bookings get their code the first time the list loads
async function getDepartures({ when, tripId }) {
  await tripCode.fillMissingTripCodes().catch((error) => console.error('Trip codes:', error?.message || error));
  return dbops.getDepartures({ when: when || 'upcoming', tripId });
}

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

  if (data.trip_code && (await dbops.isTripCodeTaken(data.trip_code, 0))) {
    throw badRequest(`Trip code ${data.trip_code} is already used by another trip`);
  }

  const id = await dbops.createDeparture(data);
  await logActivity(admin, 'create', 'departure', id, `${data.start_date} → ${data.end_date}`);
  return { id };
}

async function updateDeparture(admin, id, body) {
  const data = cleanDeparture(body);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');
  if (data.trip_code && (await dbops.isTripCodeTaken(data.trip_code, id))) {
    throw badRequest(`Trip code ${data.trip_code} is already used by another trip`);
  }

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
