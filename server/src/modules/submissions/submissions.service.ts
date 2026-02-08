import type { SketchStatus, SketchRequestPayload } from '@synth.textmode.art/contracts/sketch';
import { prisma } from '../../database/client.js';
import { existsSelect, submissionResultSelect } from '../../database/selects.js';
import { normalizeSlug, validateSlug } from '../../shared/slug.js';
import { isUniqueConstraintViolation } from '../../shared/errors.js';

const ACTIVE_SKETCH_STATUSES: SketchStatus[] = ['PENDING', 'APPROVED'];

export async function getPendingCount(): Promise<number> {
  return prisma.sketchRequest.count({ where: { status: 'PENDING' } });
}

export function normalizeAndValidateSlug(rawSlug: string): { valid: true; slug: string } | { valid: false; reason: string } {
  const normalizedSlug = normalizeSlug(rawSlug);
  const slugValidation = validateSlug(normalizedSlug);
  if (!slugValidation.valid) {
    return slugValidation;
  }
  return { valid: true, slug: normalizedSlug };
}

export async function isSlugTaken(slug: string): Promise<boolean> {
  const existing = await prisma.sketchRequest.findFirst({
    where: { slug, status: { in: ACTIVE_SKETCH_STATUSES } },
    select: existsSelect,
  });
  return Boolean(existing);
}

export async function createSketchRequest(payload: SketchRequestPayload, normalizedSlug: string) {
  try {
    const created = await prisma.sketchRequest.create({
      data: {
        slug: normalizedSlug,
        title: payload.title,
        description: payload.description ?? null,
        authorName: payload.authorName ?? null,
        license: payload.license ?? null,
        socialLinks: payload.socialLinks ?? undefined,
        textmodeCode: payload.textmodeCode,
        strudelCode: payload.strudelCode ?? null,
        publishConsentAccepted: payload.publishConsent.accepted,
        publishConsentAcceptedAt: new Date(),
        publishConsentPolicyVersion: payload.publishConsent.policyVersion,
      },
      select: submissionResultSelect,
    });
    return { ok: true as const, data: created };
  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { ok: false as const, reason: 'slug-taken' as const };
    }
    throw error;
  }
}
