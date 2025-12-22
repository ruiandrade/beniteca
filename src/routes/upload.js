const express = require('express');
const router = express.Router();
const multer = require('multer');
const blobService = require('../services/blobService');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Test endpoint
router.get('/test', (req, res) => {
  res.json({ message: 'Upload route is working' });
});

// Upload endpoint
router.post('/', upload.single('file'), async (req, res) => {
  try {
    console.log('Upload request received');
    if (!req.file) {
      console.log('No file uploaded');
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { buffer, originalname, mimetype } = req.file;
    console.log('File:', originalname, mimetype, buffer.length);

    // Choose container (default photos)
    const container = req.query.container || 'beniteca-photos';

    // Upload to Azure Blob
    const url = await blobService.uploadFile(buffer, originalname, mimetype, container);
    console.log('Upload successful, URL:', url);

    res.status(200).json({ url });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Upload failed: ' + error.message });
  }
});

module.exports = router;