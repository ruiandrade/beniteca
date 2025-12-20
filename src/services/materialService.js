const prisma = require('../lib/prisma');

class MaterialService {
  async createMaterial(data) {
    // TODO: Check permissions for level
    return await prisma.material.create({ data });
  }

  async getMaterialsByLevel(levelId) {
    return await prisma.material.findMany({
      where: { levelId: parseInt(levelId) }
    });
  }

  async updateMaterial(id, data) {
    // TODO: Permissions
    return await prisma.material.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async deleteMaterial(id) {
    // TODO: Permissions
    return await prisma.material.delete({
      where: { id: parseInt(id) }
    });
  }
}

module.exports = new MaterialService();