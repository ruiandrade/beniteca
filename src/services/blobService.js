const { BlobServiceClient } = require('@azure/storage-blob');
const { AZURE_STORAGE_CONNECTION_STRING } = process.env;

class BlobService {
  constructor() {
    this.blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
    this.defaultContainer = 'beniteca-photos';
  }

  async uploadFile(fileBuffer, fileName, mimeType, containerName = this.defaultContainer) {
    try {
      const container = containerName || this.defaultContainer;
      // Ensure container exists (private)
      const containerClient = this.blobServiceClient.getContainerClient(container);
      await containerClient.createIfNotExists(); // No public access

      // Create a unique name
      const blobName = `${Date.now()}-${fileName}`;
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);

      // Upload options
      const uploadOptions = {
        blobHTTPHeaders: {
          blobContentType: mimeType,
        },
        metadata: {
          originalName: fileName,
        },
      };

      // Upload the file
      await blockBlobClient.upload(fileBuffer, fileBuffer.length, uploadOptions);

      // Generate SAS URL for read access
      const sasUrl = await this.generateSasUrl(blockBlobClient, container);
      return sasUrl;
    } catch (error) {
      console.error('Error uploading to blob storage:', error);
      throw new Error('Failed to upload file');
    }
  }

  async generateSasUrl(blockBlobClient, containerName) {
    // Generate a SAS token for read access, valid for 1 year
    const sasOptions = {
      containerName,
      blobName: blockBlobClient.name,
      permissions: "r", // read
      expiresOn: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
    };

    const sasToken = await blockBlobClient.generateSasUrl(sasOptions);
    return sasToken;
  }
}

module.exports = new BlobService();