const levelService = require('../services/levelService');

class LevelController {
  async create(req, res) {
    try {
      const level = await levelService.createLevel(req.body);
      res.status(201).json(level);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getAll(req, res) {
    try {
      const { parentId } = req.query || {};
      const levels = await levelService.getLevels({ parentId });
      res.json(levels);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getById(req, res) {
    try {
      const level = await levelService.getLevelById(req.params.id);
      if (!level) return res.status(404).json({ error: 'Level not found' });
      res.json(level);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const level = await levelService.updateLevel(req.params.id, req.body);
      res.json(level);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await levelService.deleteLevel(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async complete(req, res) {
    try {
      const level = await levelService.completeLevel(req.params.id);
      res.json(level);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getTree(req, res) {
    try {
      const { id } = req.params;
      const tree = await levelService.getLevelTree(id);
      if (!tree) return res.status(404).json({ error: 'Level not found' });
      res.json(tree);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new LevelController();