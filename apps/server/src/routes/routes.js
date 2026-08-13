const express = require('express');

const router = express.Router();
const controller = require('../controller/controller');

router.get('/get-all-trek-details', controller.getTrekDetails);

module.exports = router;