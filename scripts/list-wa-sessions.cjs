const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.chatSession.findMany({
  select: { id:true, phone:true, createdAt:true, _count:{ select:{ messages:true } } },
  orderBy:{ createdAt:'desc' }
}).then(s => { console.log(JSON.stringify(s,null,2)); return prisma.disconnect(); }).catch(console.error);
