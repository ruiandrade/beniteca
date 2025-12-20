const express = require('express');
const router = express.Router();
const homeController = require('../controllers/homeController');

router.get('/', homeController.index);
router.use('/users', require('./users'));
router.use('/levels', require('./levels'));
router.use('/materials', require('./materials'));
router.use('/photos', require('./photos'));
router.use('/permissions', require('./permissions'));

module.exports = router;
