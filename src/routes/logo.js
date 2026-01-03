const express = require('express');
const router = express.Router();
const logoController = require('../controllers/logoController');

router.get('/', logoController.getLogo);

module.exports = router;
