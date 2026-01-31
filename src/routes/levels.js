const express = require('express');
const router = express.Router();
const levelController = require('../controllers/levelController');
const { authenticate } = require('../middleware/auth');

router.get('/', levelController.getAll);
router.get('/tree/:id', levelController.getTree);
router.put('/reorder', authenticate, levelController.reorder);
router.post('/hierarchy/create', authenticate, levelController.createHierarchy);
router.post('/hierarchy/import-excel', authenticate, levelController.createHierarchyFromExcel);
router.get('/:id/hierarchy', levelController.getHierarchy);
router.get('/:id/ratio', levelController.getRatio);
router.get('/:id/contents', levelController.getContents);
router.post('/', authenticate, levelController.create);
router.put('/:id', authenticate, levelController.update);
router.delete('/:id', authenticate, levelController.delete);
router.post('/:id/complete', authenticate, levelController.complete);
router.get('/:id', levelController.getById);

module.exports = router;