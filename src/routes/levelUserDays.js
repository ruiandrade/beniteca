const express = require('express');
const router = express.Router();
const levelUserDayController = require('../controllers/levelUserDayController');

router.get('/', levelUserDayController.getAll);
router.get('/level/:levelId', levelUserDayController.getByLevel);
router.post('/level/:levelId', levelUserDayController.setForLevel);
router.post('/', levelUserDayController.createSingle);
router.put('/:id', levelUserDayController.update);

module.exports = router;