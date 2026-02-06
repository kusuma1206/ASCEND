const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const userId = 'user_123'; // Fixed ID for Single User Context

  const user = await prisma.user.upsert({
    where: { email: 'kusuma@example.com' },
    update: {
      name: 'Kusuma', // Authenticated Name
    },
    create: {
      id: userId,
      name: 'Kusuma',
      email: 'kusuma@example.com',
    },
  });

  console.log('Single User Context Enforced:', user);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
