import { Prisma } from '@prisma/client';

/**
 * Check whether a Prisma error is a unique constraint violation (P2002).
 */
export function isUniqueConstraintViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002';
}
