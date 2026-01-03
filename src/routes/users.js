const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticate, requireAdmin } = require('../middleware/auth');

// Rota para listar gestores de obra (apenas autenticado, não precisa ser admin)
router.get('/managers', authenticate, userController.getAll);

// Apenas admins podem acessar estas rotas
router.get('/', authenticate, requireAdmin, userController.getAll);
router.get('/:id', authenticate, requireAdmin, userController.getById);
router.post('/', authenticate, requireAdmin, userController.create);
router.put('/:id', authenticate, requireAdmin, userController.update);
router.delete('/:id', authenticate, requireAdmin, userController.delete);

module.exports = router;