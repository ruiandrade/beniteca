const permissionService = require('../services/permissionService');

class PermissionController {
  async assign(req, res) {
    try {
      const { userId, levelId, permission } = req.body;
      const perm = await permissionService.assignPermission(userId, levelId, permission);
      res.status(201).json(perm);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async remove(req, res) {
    try {
      const { userId, levelId } = req.body;
      await permissionService.removePermission(userId, levelId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getByUser(req, res) {
    try {
      const permissions = await permissionService.getPermissionsByUser(req.params.userId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getByLevel(req, res) {
    try {
      const permissions = await permissionService.getPermissionsByLevel(req.params.levelId);
      res.json(permissions);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PermissionController();