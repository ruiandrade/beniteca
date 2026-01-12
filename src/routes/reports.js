const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { authenticate } = require('../middleware/auth');

// All report routes require authentication
router.get('/:obraId', authenticate, reportController.getObraReport);

module.exports = router;
