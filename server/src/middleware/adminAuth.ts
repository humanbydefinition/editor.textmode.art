import type { FastifyReply, FastifyRequest } from 'fastify';
import { env } from '../config/env';

export async function requireAdmin(request: FastifyRequest, reply: FastifyReply) {
  const authHeader = request.headers.authorization ?? '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token || token !== env.ADMIN_API_TOKEN) {
    reply.status(401).send({ error: 'Unauthorized' });
    return;
  }
}
