const express = require('express');
const router = express.Router();
const permissionController = require('../controllers/permissionController');

router.post('/assign', permissionController.assign);
router.post('/remove', permissionController.remove);
router.get('/user/:userId', permissionController.getByUser);
router.get('/level/:levelId', permissionController.getByLevel);

module.exports = router;