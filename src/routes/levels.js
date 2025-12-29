const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');

router.get('/', levelController.getAll);
router.get('/:id', levelController.getById);
router.get('/tree/:id', levelController.getTree);
router.post('/', levelController.create);
router.post('/hierarchy/create', levelController.createHierarchy);
router.put('/:id', levelController.update);
router.delete('/:id', levelController.delete);
router.post('/:id/complete', levelController.complete);

module.exports = router;