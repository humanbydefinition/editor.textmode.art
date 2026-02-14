import {
  ACTIVE_SKETCH_STATUSES,
  normalizeSlug,
  validateSlug,
  isReservedSlug,
} from '@synth.textmode.art/contracts/sketch';
import { prisma } from '../database/client.js';
import { existsSelect } from '../database/selects.js';

export { ACTIVE_SKETCH_STATUSES, normalizeSlug, validateSlug, isReservedSlug };

/** Check whether a slug is already in use by an active (PENDING | APPROVED) sketch. */
export async function isSlugTaken(slug: string): Promise<boolean> {
  const existing = await prisma.sketchRequest.findFirst({
    where: { slug, status: { in: ACTIVE_SKETCH_STATUSES } },
    select: existsSelect,
  });
  return Boolean(existing);
}
