import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();

async function shutdown() {
  await prisma.$disconnect();
}

process.on('SIGINT', () => void shutdown());
process.on('SIGTERM', () => void shutdown());
