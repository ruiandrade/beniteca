const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');

// POST /api/documents - criar documento
router.post('/', documentController.create);

// GET /api/documents/level/:levelId - listar documentos de um nível
router.get('/level/:levelId', documentController.getByLevel);

// PUT /api/documents/:id - atualizar documento
router.put('/:id', documentController.update);

// DELETE /api/documents/:id - deletar documento
router.delete('/:id', documentController.delete);

module.exports = router;
