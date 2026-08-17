const express = require('express');

const router = express.Router();

const controller = require('../controller/controller');

const { OAuth2Client } = require('google-auth-library');

const googleClient = new OAuth2Client( process.env.GOOGLE_CLIENT_ID );

router.post('/:action', controller.processPhonePe);

router.post('/auth/google', controller.googleAuthentication); 

router.get('/trek-category', controller.getTrekCategories);

router.get('/get-all-trek-details', controller.getTrekDetails);

module.exports = router;