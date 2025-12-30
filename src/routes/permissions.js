const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');
const { authenticate } = require('../middleware/auth');

router.post('/assign', permissionController.assign);
router.post('/remove', permissionController.remove);
router.get('/user/:userId', permissionController.getByUser);
router.get('/level/:levelId', permissionController.getByLevel);

// Authenticated routes
router.get('/my-works', authenticate, permissionController.getMyWorks);
router.get('/work/:levelId', authenticate, permissionController.getWorkPermission);
router.get('/level/:levelId/users', authenticate, permissionController.getLevelUsers);

module.exports = router;