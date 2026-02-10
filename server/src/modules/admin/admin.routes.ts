import type { FastifyPluginAsync } from 'fastify';
import {
  adminQueryStatusSchema,
  type AdminSessionResponse,
  adminUpdateSchema,
  type AdminSketchListResponse,
  type AdminUpdateRequestPayload,
} from '@synth.textmode.art/contracts/admin';
import { requireAdmin } from '../../middleware/admin-auth.js';
import { toAdminSketchRequest } from './admin.mapper.js';
import {
  listSketchRequests,
  findSketchRequestById,
  updateSketchRequest,
  setOgImageUrl,
} from './admin.service.js';
import { screenshotService } from '../screenshot/screenshot.service.js';

const adminRoutes: FastifyPluginAsync = async (app) => {
  const enqueueScreenshotCapture = (sketch: { id: string; slug: string }) => {
    void screenshotService.capture(sketch.slug)
      .then(async (ogImageUrl) => {
        await setOgImageUrl(sketch.id, ogImageUrl);
        app.log.info({ slug: sketch.slug, ogImageUrl }, 'Generated OG image');
      })
      .catch((error) => {
        app.log.error({ err: error, slug: sketch.slug }, 'Failed to generate OG image');
      });
  };

  app.get('/api/admin/session', { preHandler: requireAdmin }, async (_request, reply) => {
    const response: AdminSessionResponse = {
      authenticated: true,
      serverTime: new Date().toISOString(),
    };

    reply.send(response);
  });

  app.get('/api/admin/sketch-requests', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = adminQueryStatusSchema.safeParse(request.query);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed' });
      return;
    }

    const rawStatus = parsed.data.status?.toUpperCase();
    const status = rawStatus === 'PENDING' || rawStatus === 'APPROVED' || rawStatus === 'DENIED'
      ? rawStatus
      : undefined;

    const requests = await listSketchRequests(status);

    const response: AdminSketchListResponse = {
      items: requests.map(toAdminSketchRequest),
    };

    reply.send(response);
  });

  app.get('/api/admin/sketch-requests/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const id = (request.params as { id: string }).id;

    const sketch = await findSketchRequestById(id);

    if (!sketch) {
      reply.status(404).send({ error: 'Sketch request not found' });
      return;
    }

    reply.send(toAdminSketchRequest(sketch));
  });

  app.patch('/api/admin/sketch-requests/:id', { preHandler: requireAdmin }, async (request, reply) => {
    const parsed = adminUpdateSchema.safeParse(request.body);
    if (!parsed.success) {
      reply.status(400).send({ error: 'Validation failed' });
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
      const updated = await updateSketchRequest(id, { status, denialReason, reviewedBy });

      if (updated.status === 'APPROVED' && !updated.ogImageUrl) {
        enqueueScreenshotCapture({ id: updated.id, slug: updated.slug });
      }

      reply.send(toAdminSketchRequest(updated));
    } catch {
      reply.status(404).send({ error: 'Sketch request not found' });
    }
  });

  app.post('/api/admin/sketch-requests/:id/regenerate-preview', { preHandler: requireAdmin }, async (request, reply) => {
    const id = (request.params as { id: string }).id;

    const sketch = await findSketchRequestById(id);

    if (!sketch) {
      reply.status(404).send({ error: 'Sketch request not found' });
      return;
    }

    if (sketch.status !== 'APPROVED') {
      reply.status(400).send({ error: 'Only approved sketches can have previews regenerated.' });
      return;
    }

    enqueueScreenshotCapture({ id: sketch.id, slug: sketch.slug });
    reply.status(202).send({ message: 'Preview regeneration queued' });
  });
};

export default adminRoutes;
