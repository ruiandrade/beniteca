const permissionService = require('../services/permissionService');

class PermissionController {
  async assign(req, res) {
    try {
      const { userId, levelId, objectType, permission } = req.body;
      const perm = await permissionService.assignPermission(userId, levelId, objectType, permission);
      res.status(201).json(perm);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async remove(req, res) {
    try {
      const { userId, levelId, objectType } = req.body;
      await permissionService.removePermission(userId, levelId, objectType);
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

  /**
   * Get works accessible by current user
   */
  async getMyWorks(req, res) {
    try {
      const userId = req.user.id;
      
      // If user is admin, return all works
      if (req.user.role === 'A') {
        const works = await permissionService.getAllWorks();
        return res.json(works);
      }

      // Otherwise, return only works user has permission for
      const works = await permissionService.getUserWorks(userId);
      res.json(works);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get user permission for a specific work
   */
  async getWorkPermission(req, res) {
    try {
      const userId = req.user.id;
      const { levelId } = req.params;
      const { objectType } = req.query;
      
      const permission = await permissionService.getUserWorkPermission(userId, levelId, objectType);
      
      if (!permission) {
        return res.status(403).json({ error: 'Sem acesso a esta obra' });
      }

      res.json(permission);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  /**
   * Get users associated with a level/obra with their permissions
   */
  async getLevelUsers(req, res) {
    try {
      const { levelId } = req.params;
      const users = await permissionService.getUsersByLevelWithPermissions(levelId);
      res.json(users);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PermissionController();