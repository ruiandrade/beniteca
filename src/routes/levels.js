const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');

router.get('/', levelController.getAll);
router.get('/tree/:id', levelController.getTree);
router.put('/reorder', levelController.reorder);
router.post('/hierarchy/create', levelController.createHierarchy);
router.post('/hierarchy/import-excel', levelController.createHierarchyFromExcel);
router.get('/:id/hierarchy', levelController.getHierarchy);
router.get('/:id/contents', levelController.getContents);
router.post('/', levelController.create);
router.get('/:id', levelController.getById);
router.put('/:id', levelController.update);
router.delete('/:id', levelController.delete);
router.post('/:id/complete', levelController.complete);

module.exports = router;