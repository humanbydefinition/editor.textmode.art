import type { FastifyPluginAsync } from 'fastify';
import {
  adminQueryStatusSchema,
  adminUpdateSchema,
  type AdminSketchListResponse,
  type AdminUpdateRequestPayload,
} from '@synth.textmode.art/contracts/admin';
import { prisma } from '../db.js';
import { requireAdmin } from '../middleware/adminAuth.js';
import { toAdminSketchRequest } from '../contracts/sketchMappers.js';

const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/api/admin/sketch-requests', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = adminQueryStatusSchema.safeParse(request.query);
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

    const response: AdminSketchListResponse = {
      items: requests.map(toAdminSketchRequest),
    };

    reply.send(response);
  });

  app.patch('/api/admin/sketch-requests/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = adminUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed', issues: parsed.error.flatten() });
      return;
    }

    const payload: AdminUpdateRequestPayload = parsed.data;
    const { status, denialReason, reviewedBy } = payload;
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

      reply.send(toAdminSketchRequest(updated));
    } catch {
      reply.status(404).send({ error: 'Sketch request not found' });
    }
  });
};

export default adminRoutes;
