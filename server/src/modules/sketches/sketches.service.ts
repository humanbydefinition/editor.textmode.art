import { prisma } from '../../database/client.js';
import { publicSketchSelect } from '../../database/selects.js';
import { normalizeSlug, validateSlug, ACTIVE_SKETCH_STATUSES } from '../../shared/slug.js';

export { isSlugTaken } from '../../shared/slug.js';

export async function findApprovedSketchBySlug(rawSlug: string) {
  const normalizedSlug = normalizeSlug(rawSlug);
  const slugValidation = validateSlug(normalizedSlug);
  if (!slugValidation.valid) return null;

  return prisma.sketchRequest.findFirst({
    where: { slug: normalizedSlug, status: 'APPROVED' },
    select: publicSketchSelect,
  });
}

export async function findActiveSketchBySlug(rawSlug: string) {
  const normalizedSlug = normalizeSlug(rawSlug);
  const slugValidation = validateSlug(normalizedSlug);
  if (!slugValidation.valid) return null;

  return prisma.sketchRequest.findFirst({
    where: { slug: normalizedSlug, status: { in: ACTIVE_SKETCH_STATUSES } },
    select: publicSketchSelect,
  });
}

export async function findRandomApprovedSketch(excludeSlug?: string) {
  const whereClause = {
    status: 'APPROVED' as const,
    ...(excludeSlug ? { slug: { not: excludeSlug } } : {}),
  };

  const total = await prisma.sketchRequest.count({ where: whereClause });
  if (total === 0) return null;

  const randomIndex = Math.floor(Math.random() * total);
  return prisma.sketchRequest.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'asc' },
    skip: randomIndex,
    select: publicSketchSelect,
  });
}

