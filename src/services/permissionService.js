const prisma = require('../lib/prisma');

class PermissionService {
  async assignPermission(userId, levelId, permission) {
    // TODO: Check if current user can assign (admin or CM)
    return await prisma.permission.upsert({
      where: { userId_levelId: { userId: parseInt(userId), levelId: parseInt(levelId) } },
      update: { permission },
      create: { userId: parseInt(userId), levelId: parseInt(levelId), permission }
    });
  }

  async removePermission(userId, levelId) {
    return await prisma.permission.deleteMany({
      where: { userId: parseInt(userId), levelId: parseInt(levelId) }
    });
  }

  async getPermissionsByUser(userId) {
    return await prisma.permission.findMany({
      where: { userId: parseInt(userId) },
      include: { level: true }
    });
  }

  async getPermissionsByLevel(levelId) {
    return await prisma.permission.findMany({
      where: { levelId: parseInt(levelId) },
      include: { user: true }
    });
  }
}

module.exports = new PermissionService();