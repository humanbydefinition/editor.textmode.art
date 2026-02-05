import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../db';
import { requireAdmin } from '../middleware/adminAuth';

const statusQuerySchema = z.object({
  status: z.string().optional(),
});

const adminUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED']),
  denialReason: z.string().max(300).optional().nullable(),
  reviewedBy: z.string().max(80).optional().nullable(),
});

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/admin/sketch-requests', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = statusQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const rawStatus = parsed.data.status?.toUpperCase();
    const status = rawStatus === 'PENDING' || rawStatus === 'APPROVED' || rawStatus === 'DENIED'
      ? rawStatus
      : undefined;

    const requests = await prisma.sketchRequest.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
    });

    reply.send({
      items: requests,
    });
  });

  app.patch('/api/admin/sketch-requests/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = adminUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const { status, denialReason, reviewedBy } = parsed.data;
    if (status === 'DENIED' && !denialReason) {
      reply.status(400).send({ error: 'Denial reason is required when denying a request.' });
      return;
    }

    const id = (request.params as { id: string }).id;

    try {
      const updated = await prisma.sketchRequest.update({
        where: { id },
        data: {
          status,
          denialReason: status === 'DENIED' ? denialReason ?? null : null,
          reviewedAt: new Date(),
          reviewedBy: reviewedBy ?? null,
        },
      });

      reply.send(updated);
    } catch (error) {
      reply.status(404).send({ error: 'Sketch request not found' });
    }
  });
};

export default adminRoutes;
