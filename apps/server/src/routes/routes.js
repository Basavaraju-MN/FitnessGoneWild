const express = require('express');

const router = express.Router();

const phonepeController = require('../controller/controller');


router.post(
  '/:action',
  phonepeController.processPhonePe
);


module.exports = router;