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

  async createSingle(req, res) {
    try {
      const { levelId, userId, day, period, appeared, observations, overtimeHours } = req.body;
      if (!levelId || !userId || !day || !period) {
        return res.status(400).json({ error: 'levelId, userId, day e period são obrigatórios' });
      }
      if (!['m', 'a'].includes(period)) {
        return res.status(400).json({ error: 'period must be "m" or "a"' });
      }
      if (appeared && !['yes', 'no'].includes(appeared)) {
        return res.status(400).json({ error: 'appeared must be "yes" or "no"' });
      }

      const result = await levelUserDayService.createSingle({
        levelId: parseInt(levelId),
        userId: parseInt(userId),
        day,
        period,
        appeared: appeared || null,
        observations: observations || '',
        overtimeHours: overtimeHours !== undefined ? parseFloat(overtimeHours) : 0
      });

      res.status(201).json(result);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const { appeared, observations, overtimeHours } = req.body;
      
      if (!appeared || !['yes', 'no'].includes(appeared)) {
        return res.status(400).json({ error: 'appeared must be "yes" or "no"' });
      }

      const result = await levelUserDayService.update(
        parseInt(id), 
        appeared, 
        observations || '', 
        overtimeHours !== undefined ? parseFloat(overtimeHours) : 0
      );
      
      if (!result) {
        return res.status(404).json({ error: 'Record not found' });
      }

      res.json({ success: true, updated: result });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new LevelUserDayController();