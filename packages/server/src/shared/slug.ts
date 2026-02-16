import type { SketchStatus } from '@synth.textmode.art/contracts/sketch';
import { prisma } from '../database/client.js';
import { existsSelect } from '../database/selects.js';

export {
  normalizeSlug,
  validateSlug,
  normalizeAndValidateSlug,
  isReservedSlug,
} from '@synth.textmode.art/contracts/sketch';

/** Sketch statuses that "occupy" a slug (i.e. prevent reuse). */
export const ACTIVE_SKETCH_STATUSES: SketchStatus[] = ['PENDING', 'APPROVED'];

/** Check whether a slug is already in use by an active (PENDING | APPROVED) sketch. */
export async function isSlugTaken(slug: string): Promise<boolean> {
  const existing = await prisma.sketchRequest.findFirst({
    where: { slug, status: { in: ACTIVE_SKETCH_STATUSES } },
    select: existsSelect,
  });
  return Boolean(existing);
}
