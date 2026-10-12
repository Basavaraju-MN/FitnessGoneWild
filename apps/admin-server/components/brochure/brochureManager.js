// Brochure Downloads screen (leads + follow-up).
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const {
  badRequest,
  notFound,
  pick,
  logActivity,
} = require('../../utils/http');
const {
  FOLLOW_UP_STATUSES,
} = require('../common/rules');

// Returns { rows, stats }
const getBrochureDownloads = () => dbops.getBrochureDownloads();

async function updateBrochureDownload(admin, id, body) {
  const data = pick(body, ['follow_up_status', 'notes', 'assigned_to']);
  if (data.follow_up_status !== undefined && !FOLLOW_UP_STATUSES.includes(data.follow_up_status)) {
    throw badRequest('Unknown follow-up status');
  }
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  if (!(await dbops.updateBrochureDownload(id, data))) throw notFound('Lead not found');

  await logActivity(admin, 'update', 'brochure_download', id, Object.keys(data).join(', '));
  return { id };
}

module.exports = {
  getBrochureDownloads,
  updateBrochureDownload,
};
