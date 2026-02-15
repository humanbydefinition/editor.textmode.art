import type { SketchRequestPayload } from '@synth.textmode.art/contracts/sketch';
import { prisma } from '../../database/client.js';
import { submissionResultSelect } from '../../database/selects.js';
import { isUniqueConstraintViolation } from '../../shared/errors.js';
import { DiscordService } from '../discord/discord.service.js';

export { isSlugTaken, normalizeAndValidateSlug } from '../../shared/slug.js';

export async function getPendingCount(): Promise<number> {
  return prisma.sketchRequest.count({ where: { status: 'PENDING' } });
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

    // Fire-and-forget Discord notification
    DiscordService.getInstance().sendSubmissionNotification(payload, normalizedSlug).catch((err) => {
      console.error('Failed to send Discord notification', err);
    });

    return { ok: true as const, data: created };

  } catch (error) {
    if (isUniqueConstraintViolation(error)) {
      return { ok: false as const, reason: 'slug-taken' as const };
    }
    throw error;
  }
}
