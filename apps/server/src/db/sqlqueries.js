const sqlqueries = {
  getTrekCategories: `SELECT * FROM categories`,
  getTrekDetails: `SELECT * FROM trips WHERE category_id = ?`,
  downloadBroucher: ` SELECT id, trip_id, file_name, file_data, file_size, mime_type FROM brochures WHERE trip_id = ?`,
  updateDownloadCount: `UPDATE brochures SET download_count = download_count + 1 WHERE trip_id = ?`
};

(module.exports = sqlqueries);