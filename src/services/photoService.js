const prisma = require('../lib/prisma');

class PhotoService {
  async createPhoto(data) {
    // TODO: Check permissions, upload to blob
    return await prisma.photo.create({ data });
  }

  async getPhotosByLevel(levelId) {
    return await prisma.photo.findMany({
      where: { levelId: parseInt(levelId) }
    });
  }

  async updatePhoto(id, data) {
    // TODO: Permissions
    return await prisma.photo.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async deletePhoto(id) {
    // TODO: Permissions, delete from blob
    return await prisma.photo.delete({
      where: { id: parseInt(id) }
    });
  }
}

module.exports = new PhotoService();