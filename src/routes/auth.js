const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authenticate, requireAdmin } = require('../middleware/auth');

router.post('/login', authController.login);
router.post('/change-password', authenticate, authController.changePassword);
router.post('/create-user', authenticate, requireAdmin, authController.createUser);

module.exports = router;
