const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/', homeController.index);
router.use('/users', require('./users'));
router.use('/levels', require('./levels'));
router.use('/materials', require('./materials'));
router.use('/photos', require('./photos'));
router.use('/documents', require('./documents'));
router.use('/permissions', require('./permissions'));
router.use('/upload', require('./upload'));
router.use('/level-users', require('./levelUsers'));
router.use('/level-user-days', require('./levelUserDays'));
router.use('/auth', require('./auth'));

module.exports = router;
