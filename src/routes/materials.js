const express = require('express');
const router = express.Router();
const materialController = require('../controllers/materialController');

router.get('/level/:levelId', materialController.getByLevel);
router.post('/', materialController.create);
router.put('/:id', materialController.update);
router.delete('/:id', materialController.delete);

module.exports = router;