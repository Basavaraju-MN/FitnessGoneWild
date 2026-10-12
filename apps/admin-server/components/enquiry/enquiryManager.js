// Enquiries & Leads screen.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const {
  badRequest,
  notFound,
  pick,
  requireFields,
  logActivity,
} = require('../../utils/http');
const {
  ENQUIRY_STATUSES,
  ENQUIRY_SOURCES,
} = require('../common/rules');

const getEnquiries = () => dbops.getEnquiries();

async function createEnquiry(admin, body) {
  requireFields(body, ['name', 'phone']);
  const data = pick(body, ['name', 'phone', 'email', 'trip_id', 'people', 'note', 'source', 'assigned_to']);

  if (data.source && !ENQUIRY_SOURCES.includes(data.source)) throw badRequest('Unknown source');

  const id = await dbops.createEnquiry({ status: 'new', ...data });
  await logActivity(admin, 'create', 'enquiry', id, data.name);
  return { id };
}

async function updateEnquiry(admin, id, body) {
  const data = pick(body, ['status', 'assigned_to', 'note', 'trip_id', 'people', 'email']);
  if (data.status !== undefined && !ENQUIRY_STATUSES.includes(data.status)) throw badRequest('Unknown status');
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  if (!(await dbops.updateEnquiry(id, data))) throw notFound('Enquiry not found');

  await logActivity(admin, 'update', 'enquiry', id, Object.keys(data).join(', '));
  return { id };
}

module.exports = {
  getEnquiries,
  createEnquiry,
  updateEnquiry,
};
