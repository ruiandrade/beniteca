const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const admin = await prisma.user.upsert({
    where: { email: 'admin@beniteca.com' },
    update: {},
    create: {
      email: 'admin@beniteca.com',
      name: 'Admin User',
      status: 'A'
    }
  });

  // Create CM
  const cm = await prisma.user.upsert({
    where: { email: 'cm@beniteca.com' },
    update: {},
    create: {
      email: 'cm@beniteca.com',
      name: 'Construction Manager',
      status: 'C'
    }
  });

  // Create root level
  const root = await prisma.level.upsert({
    where: { id: 1 },
    update: {},
    create: {
      name: 'Condomínio no Algarve',
      description: 'Main project',
      coverImage: 'https://example.com/cover.jpg',
      constructionManagerId: cm.id
    }
  });

  // Create sub level
  const sub = await prisma.level.upsert({
    where: { id: 2 },
    update: {},
    create: {
      name: 'Edifício Norte',
      description: 'North building',
      parentId: root.id,
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-12-31')
    }
  });

  console.log('Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });