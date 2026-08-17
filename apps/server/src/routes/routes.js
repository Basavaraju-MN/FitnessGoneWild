const express = require('express');

const router = express.Router();

const phonepeController = require('../controller/controller');


router.post(
  '/:action',
  phonepeController.processPhonePe
);

const controller = require('../controller/controller');

router.get('/trek-category', controller.getTrekCategories);

router.get('/get-all-trek-details', controller.getTrekDetails);

module.exports = router;