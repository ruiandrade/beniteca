const express = require('express');
const router = express.Router();
const levelUserController = require('../controllers/levelUserController');

router.get('/level/:levelId', levelUserController.getByLevel);
router.post('/', levelUserController.add);
router.delete('/:id', levelUserController.remove);

module.exports = router;