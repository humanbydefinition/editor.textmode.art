import { PrismaClient } from '../../prisma/generated/prisma/client.js';
import { PrismaPg } from '@prisma/adapter-pg';
import { env } from '../config/env.js';

const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
export const prisma = new PrismaClient({ adapter });
