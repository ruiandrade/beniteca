const materialService = require('../services/materialService');

class MaterialController {
  async create(req, res) {
    try {
      const material = await materialService.createMaterial(req.body);
      res.status(201).json(material);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getByLevel(req, res) {
    try {
      const materials = await materialService.getMaterialsByLevel(req.params.levelId);
      res.json(materials);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const material = await materialService.updateMaterial(req.params.id, req.body);
      res.json(material);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await materialService.deleteMaterial(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new MaterialController();