const sqlqueries = {
  getTrekCategories: `SELECT * FROM categories`,
  getTrekDetails: `SELECT * FROM trips WHERE category_id = ?`,
};

(module.exports = sqlqueries);