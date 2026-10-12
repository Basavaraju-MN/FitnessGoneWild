// Customers screen.
// Called by controller/controller.js; reads and writes through db/dbops.js.
const dbops = require('../../db/dbops');
const {
  badRequest,
  notFound,
  pick,
  logActivity,
} = require('../../utils/http');

const getCustomers = () => dbops.getCustomers();

async function getCustomer(id) {
  const customer = await dbops.getCustomerById(id);
  if (!customer) throw notFound('Customer not found');

  return { ...customer, ...(await dbops.getCustomerHistory(customer)) };
}

async function updateCustomer(admin, id, body) {
  const data = pick(body, ['name', 'phone', 'email', 'city']);
  if (!Object.keys(data).length) throw badRequest('Nothing to update');

  if (!(await dbops.updateCustomer(id, data))) throw notFound('Customer not found');

  await logActivity(admin, 'update', 'customer', id, Object.keys(data).join(', '));
  return { id };
}

module.exports = {
  getCustomers,
  getCustomer,
  updateCustomer,
};
