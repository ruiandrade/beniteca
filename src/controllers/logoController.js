const { BlobServiceClient } = require('@azure/storage-blob');
const { AZURE_STORAGE_CONNECTION_STRING } = process.env;

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

const getLogo = async (req, res) => {
  try {
    const containerClient = blobServiceClient.getContainerClient('beniteca-base');
    const blockBlobClient = containerClient.getBlockBlobClient('beniteca_logo.jpg');

    // Generate SAS token valid for 1 year
    const sasOptions = {
      containerName: 'beniteca-base',
      blobName: 'beniteca_logo.jpg',
      permissions: "r",
      expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    };

    const sasUrl = await blockBlobClient.generateSasUrl(sasOptions);
    
    res.json({ url: sasUrl });
  } catch (error) {
    console.error('Error generating logo URL:', error);
    res.status(500).json({ error: 'Failed to load logo' });
  }
};

module.exports = { getLogo };
