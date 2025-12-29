const levelUserDayService = require('../services/levelUserDayService');

class LevelUserDayController {
  async getAll(req, res) {
    try {
      const { from, to } = req.query;
      const data = await levelUserDayService.getAll(from, to);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async getByLevel(req, res) {
    try {
      const { levelId } = req.params;
      const { from, to } = req.query;
      const data = await levelUserDayService.getByLevel(levelId, from, to);
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async setForLevel(req, res) {
    try {
      const { levelId } = req.params;
      const { from, to, entries } = req.body;
      if (!from || !to) return res.status(400).json({ error: 'from and to are required' });

      const saved = await levelUserDayService.setRange(levelId, from, to, entries || []);
      res.status(200).json({ saved: saved.length });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new LevelUserDayController();