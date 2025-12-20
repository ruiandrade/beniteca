const prisma = require('../lib/prisma');

class UserService {
  async createUser(data) {
    // TODO: Check if current user is admin
    return await prisma.user.create({ data });
  }

  async getUsers() {
    return await prisma.user.findMany({
      include: {
        permissions: {
          include: { level: true }
        },
        managedLevels: true
      }
    });
  }

  async getUserById(id) {
    return await prisma.user.findUnique({
      where: { id: parseInt(id) },
      include: {
        permissions: {
          include: { level: true }
        },
        managedLevels: true
      }
    });
  }

  async updateUser(id, data) {
    // TODO: Permissions
    return await prisma.user.update({
      where: { id: parseInt(id) },
      data
    });
  }

  async deleteUser(id) {
    // TODO: Permissions
    return await prisma.user.delete({
      where: { id: parseInt(id) }
    });
  }
}

module.exports = new UserService();