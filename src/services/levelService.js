const prisma = require('../lib/prisma');

class LevelService {
  async createLevel(data) {
    // Check if parent exists if provided
    if (data.parentId) {
      const parent = await prisma.level.findUnique({ where: { id: data.parentId } });
      if (!parent) throw new Error('Parent level not found');
    }
    // For root levels, constructionManagerId can be set
    return await prisma.level.create({ data });
  }

  async getLevels() {
    return await prisma.level.findMany({
      include: {
        children: true,
        parent: true,
        materials: true,
        photos: true,
        permissions: { include: { user: true } },
        constructionManager: true
      }
    });
  }

  async getLevelById(id) {
    return await prisma.level.findUnique({
      where: { id: parseInt(id) },
      include: {
        children: {
          include: {
            materials: true,
            photos: true,
            permissions: { include: { user: true } }
          }
        },
        parent: true,
        materials: true,
        photos: true,
        permissions: { include: { user: true } },
        constructionManager: true
      }
    });
  }

  async updateLevel(id, data) {
    // TODO: Permissions
    return await prisma.level.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async deleteLevel(id) {
    // TODO: Check if has children, or cascade
    return await prisma.level.delete({
      where: { id: parseInt(id) }
    });
  }

  // Check if level can be completed
  async canCompleteLevel(id) {
    const level = await this.getLevelById(id);
    if (!level) return false;
    // All children must be completed
    for (const child of level.children) {
      if (!child.completed) return false;
    }
    return true;
  }

  // Mark as completed
  async completeLevel(id) {
    if (!(await this.canCompleteLevel(id))) {
      throw new Error('Cannot complete level: children not completed');
    }
    return await this.updateLevel(id, { completed: true });
  }
}

module.exports = new LevelService();