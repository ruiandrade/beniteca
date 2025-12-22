const documentService = require('../services/documentService');

class DocumentController {
  async create(req, res) {
    try {
      const document = await documentService.createDocument(req.body);
      res.status(201).json(document);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async getByLevel(req, res) {
    try {
      const { levelId } = req.params;
      const documents = await documentService.getDocumentsByLevel(levelId);
      res.json(documents);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async update(req, res) {
    try {
      const { id } = req.params;
      const document = await documentService.updateDocument(id, req.body);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json(document);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async delete(req, res) {
    try {
      const { id } = req.params;
      const document = await documentService.deleteDocument(id);
      if (!document) {
        return res.status(404).json({ error: 'Document not found' });
      }
      res.json({ message: 'Document deleted', document });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new DocumentController();
