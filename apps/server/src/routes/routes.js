const express = require('express');

const router = express.Router();

const phonepeController = require('../controller/controller');

// router.post(
//   '/:action',
//   phonepeController.processPhonePe
// );

const controller = require('../controller/controller');


router.get('/trek-category', controller.getTrekCategories);

router.get('/get-all-trek-details', controller.getTrekDetails);

router.post('/brochure-download', controller.downloadBroucher)

router.post('/create-payment', controller.createPhonePePayment);

router.get('/payment-status/:merchantOrderId', controller.checkPhonePePaymentStatus);

router.post('/webhook', controller.phonePeWebhook);

module.exports = router;