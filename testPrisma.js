const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    // Teste simples: contar usuários
    const userCount = await prisma.user.count();
    console.log('Connection successful. User count:', userCount);

    // Criar um usuário de teste
    const user = await prisma.user.create({
      data: {
        email: 'admin@beniteca.com',
        name: 'Admin User',
        status: 'A'
      }
    });
    console.log('Created user:', user);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();