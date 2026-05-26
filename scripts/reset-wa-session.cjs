const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const sessionId = parseInt(process.argv[2] || '9', 10);

prisma.chatMessage.deleteMany({ where: { sessionId } })
  .then(r => {
    console.log(`Deleted ${r.count} messages from session ${sessionId}`);
    return prisma.$disconnect();
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
