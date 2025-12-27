const levelUserService = require('../services/levelUserService');

class LevelUserController {
  async getByLevel(req, res) {
    try {
      const { levelId } = req.params;
      const data = await levelUserService.getByLevel(levelId);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async add(req, res) {
    try {
      const { levelId, userId } = req.body;
      if (!levelId || !userId) return res.status(400).json({ error: 'levelId and userId are required' });
      const created = await levelUserService.add(levelId, userId);
      res.status(201).json(created);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async remove(req, res) {
    try {
      const { id } = req.params;
      const deleted = await levelUserService.remove(id);
      if (!deleted) return res.status(404).json({ error: 'Association not found' });
      res.json(deleted);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new LevelUserController();