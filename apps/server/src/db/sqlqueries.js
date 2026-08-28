const sqlqueries = {
  getTrekCategories: `SELECT * FROM categories`,
  getTrekDetails: `SELECT * FROM trips WHERE category_id = ?`,
  downloadBroucher: ` SELECT id, trip_id, file_name, file_data, file_size, mime_type FROM brochures WHERE trip_id = ?`,
  updateDownloadCount: `UPDATE brochures SET download_count = download_count + 1 WHERE trip_id = ?`,
  phonepeSql : {
    createTransaction: `INSERT INTO phonepe_transactions (merchant_order_id, user_id, amount, currency, status, redirect_url) VALUES (?, ?, ?, ?, 'PROCESSING', ?)`,
    getTransactionByOrderId: `SELECT * FROM phonepe_transactions WHERE merchant_order_id = ? LIMIT 1`,
    updateTransactionStatus: `UPDATE phonepe_transactions SET status = ?, phonepe_state = ?, response_code = ?, response_message = ?, phonepe_order_id = ?, transaction_id = ?, provider_reference_id = ?, payment_method = ?, payment_timestamp = ?, updated_at = NOW() WHERE merchant_order_id = ?`,
    insertWebhookLog: `INSERT INTO phonepe_webhook_logs (merchant_order_id, event_type, authorization, request_body, payment_status, signature_valid, processing_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
    updateWebhookLog: `UPDATE phonepe_webhook_logs SET processing_status = ?, error_message = ?, processed_at = NOW() WHERE id = ?`,
    getWebhookLogById: `SELECT * FROM phonepe_webhook_logs WHERE id = ? LIMIT 1`,
}
};

(module.exports = sqlqueries);