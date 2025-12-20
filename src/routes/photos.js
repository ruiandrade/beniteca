const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');

router.get('/level/:levelId', photoController.getByLevel);
router.post('/', photoController.create);
router.put('/:id', photoController.update);
router.delete('/:id', photoController.delete);

module.exports = router;