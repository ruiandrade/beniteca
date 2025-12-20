const photoService = require('../services/photoService');

class PhotoController {
  async create(req, res) {
    try {
      const photo = await photoService.createPhoto(req.body);
      res.status(201).json(photo);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async getByLevel(req, res) {
    try {
      const photos = await photoService.getPhotosByLevel(req.params.levelId);
      res.json(photos);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }

  async update(req, res) {
    try {
      const photo = await photoService.updatePhoto(req.params.id, req.body);
      res.json(photo);
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async delete(req, res) {
    try {
      await photoService.deletePhoto(req.params.id);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
}

module.exports = new PhotoController();