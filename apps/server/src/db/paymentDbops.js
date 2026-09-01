const { executeQuery } = require('./connection');

const queries = {
  createTransaction: `INSERT INTO phonepe_transactions (merchant_order_id, amount, currency, status, redirect_url) VALUES (?, ?, ?, 'PROCESSING', ?)`,
  getTransactionByOrderId: `SELECT * FROM phonepe_transactions WHERE merchant_order_id = ? LIMIT 1`,
  updateTransactionStatus: `UPDATE phonepe_transactions SET status = ?, phonepe_state = ?, response_code = ?, response_message = ?, phonepe_order_id = ?, transaction_id = ?, provider_reference_id = ?, payment_method = ?, payment_timestamp = ?, updated_at = NOW() WHERE merchant_order_id = ?`,
  insertWebhookLog: `INSERT INTO phonepe_webhook_logs (merchant_order_id, event_type, authorization, request_body, payment_status, signature_valid, processing_status) VALUES (?, ?, ?, ?, ?, ?, ?)`,
  updateWebhookLog: `UPDATE phonepe_webhook_logs SET processing_status = ?, error_message = ?, processed_at = NOW() WHERE id = ?`,
};

async function createTransaction(merchantOrderId, amount, currency, redirectUrl) {
  return executeQuery(queries.createTransaction, [
    merchantOrderId, amount, currency, redirectUrl,
  ]);
}

async function getTransactionByOrderId(merchantOrderId) {
  const rows = await executeQuery(queries.getTransactionByOrderId, [merchantOrderId]);
  return rows[0] || null;
}

async function updateTransactionStatus({ merchantOrderId, status, phonepeState, responseCode, responseMessage, phonepeOrderId, transactionId, providerReferenceId, paymentMethod, paymentTimestamp }) {
  return executeQuery(queries.updateTransactionStatus, [
    status, phonepeState || null, responseCode || null, responseMessage || null,
    phonepeOrderId || null, transactionId || null, providerReferenceId || null,
    paymentMethod || null, paymentTimestamp || null, merchantOrderId,
  ]);
}

async function insertWebhookLog({ merchantOrderId, eventType, authorization, requestBody, paymentStatus, signatureValid, processingStatus }) {
  const result = await executeQuery(queries.insertWebhookLog, [
    merchantOrderId || null, eventType || null, authorization || null,
    JSON.stringify(requestBody || {}), paymentStatus || null, signatureValid ? 1 : 0,
    processingStatus || 'RECEIVED',
  ]);
  return result.insertId;
}

async function updateWebhookLog(id, processingStatus, errorMessage) {
  return executeQuery(queries.updateWebhookLog, [processingStatus, errorMessage || null, id]);
}

module.exports = {
  createTransaction,
  getTransactionByOrderId,
  updateTransactionStatus,
  insertWebhookLog,
  updateWebhookLog,
};
