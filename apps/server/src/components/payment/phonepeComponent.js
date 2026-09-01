const { randomUUID } = require('crypto');
const { StandardCheckoutPayRequest } = require('@phonepe-pg/pg-sdk-node');
const paymentDbOps = require('../../db/paymentDbops');
const { phonePeClient } = require('../../config/config');

exports.createPayment = async ({ amount }) => {

  if (amount === undefined || amount === null || amount === '') {
    throw new Error('Amount is required');
  }

  const numericAmount = Number(amount);

  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error('Invalid payment amount');
  }

  const amountInPaise = Math.round(numericAmount * 100);

  const merchantOrderId = `FGW_${Date.now()}_${randomUUID()
    .replace(/-/g, '')
    .substring(0, 12)}`;

  const redirectUrl =
    `${process.env.PHONEPE_REDIRECT_URL}?merchantOrderId=${encodeURIComponent(
      merchantOrderId
    )}`;

  await paymentDbOps.createTransaction(
    merchantOrderId,
    amountInPaise,
    'INR',
    redirectUrl
  );

  const request = StandardCheckoutPayRequest.builder()
    .merchantOrderId(merchantOrderId)
    .amount(amountInPaise)
    .redirectUrl(redirectUrl)
    .build();

  const response = await phonePeClient.pay(request);

  if (!response?.redirectUrl) {
    throw new Error('PhonePe checkout URL was not generated');
  }

  return {
    success: true,
    merchantOrderId,
    amount: amountInPaise,
    redirectUrl: response.redirectUrl,
    status: 'PROCESSING',
  };
};

exports.checkPaymentStatus = async (merchantOrderId) => {
    if (!merchantOrderId) throw new Error('merchantOrderId is required');

    const transaction = await paymentDbOps.getTransactionByOrderId(merchantOrderId);
    if (!transaction) throw new Error('Payment transaction not found');

    const response = await phonePeClient.getOrderStatus(merchantOrderId);
    const state = response.state;
    const status = state === 'COMPLETED' ? 'SUCCESS' : state === 'FAILED' ? 'FAILED' : 'PROCESSING';

    await paymentDbOps.updateTransactionStatus({
        merchantOrderId, status, phonepeState: state,
        responseCode: response.responseCode, responseMessage: response.responseMessage,
        phonepeOrderId: response.orderId, transactionId: response.transactionId,
        providerReferenceId: response.providerReferenceId,
        paymentMethod: response.paymentInstrument?.type,
        paymentTimestamp: response.paymentTimestamp
    });

    return { merchantOrderId, status, phonepeState: state, phonepeResponse: response };
};

exports.processWebhook = async ({ authorization, rawBody }) => {
    if (!authorization) throw new Error('PhonePe Authorization header missing');
    if (!rawBody) throw new Error('PhonePe webhook body missing');

    let callback;
    try {
        callback = phonePeClient.validateCallback(
            process.env.PHONEPE_WEBHOOK_USERNAME,
            process.env.PHONEPE_WEBHOOK_PASSWORD,
            authorization,
            rawBody
        );
    } catch (error) {
        console.error('PhonePe callback validation failed:', error);
        throw new Error('Invalid PhonePe webhook');
    }

    const payload = callback.payload || {};
    const merchantOrderId = payload.orderId;
    const state = payload.state;

    const webhookId = await paymentDbOps.insertWebhookLog({
        merchantOrderId,
        eventType: callback.type || callback.event,
        authorization,
        requestBody: JSON.parse(rawBody),
        paymentStatus: state,
        signatureValid: true,
        processingStatus: 'RECEIVED'
    });

    try {
        let status = state === 'COMPLETED' ? 'SUCCESS' : state === 'FAILED' ? 'FAILED' : 'PROCESSING';

        const transaction = await paymentDbOps.getTransactionByOrderId(merchantOrderId);
        if (!transaction) throw new Error(`Transaction not found: ${merchantOrderId}`);

        if (transaction.status === 'SUCCESS' && status !== 'SUCCESS') status = 'SUCCESS';

        await paymentDbOps.updateTransactionStatus({
            merchantOrderId, status, phonepeState: state,
            responseCode: payload.responseCode, responseMessage: payload.responseMessage,
            phonepeOrderId: payload.orderId, transactionId: payload.transactionId,
            providerReferenceId: payload.providerReferenceId,
            paymentMethod: payload.paymentInstrument?.type,
            paymentTimestamp: payload.paymentTimestamp
        });

        await paymentDbOps.updateWebhookLog(webhookId, 'PROCESSED', null);
        return { success: true, merchantOrderId, status, state };
    } catch (error) {
        await paymentDbOps.updateWebhookLog(webhookId, 'FAILED', error.message);
        throw error;
    }
};
