import { timingSafeEqual } from 'node:crypto';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env.js';

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization ?? '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token || !constantTimeEquals(token, env.ADMIN_API_TOKEN)) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
}
