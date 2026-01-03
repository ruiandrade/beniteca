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

      const result = await levelUserDayService.setRange(levelId, from, to, entries || []);
      
      if (result.conflicts && result.conflicts.length > 0) {
        return res.status(200).json({ 
          saved: result.inserted.length,
          conflicts: result.conflicts.length,
          message: result.error,
          conflictDetails: result.conflicts
        });
      }
      
      res.status(200).json({ saved: result.inserted.length });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}

module.exports = new LevelUserDayController();