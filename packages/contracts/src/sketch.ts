import { z } from 'zod';

export const SLUG_MIN_LENGTH = 3;
export const SLUG_MAX_LENGTH = 32;

export const sketchStatusSchema = z.enum(['PENDING', 'APPROVED', 'DENIED']);
export type SketchStatus = z.infer<typeof sketchStatusSchema>;
export const antiSpamAlgorithmSchema = z.literal('sha256-leading-zero-bits-v1');
export type AntiSpamAlgorithm = z.infer<typeof antiSpamAlgorithmSchema>;
export const publishConsentPolicyVersionSchema = z.string().min(1).max(64);
export const publishConsentSchema = z.object({
  accepted: z.literal(true),
  policyVersion: publishConsentPolicyVersionSchema,
});
export type PublishConsent = z.infer<typeof publishConsentSchema>;

export const socialLinkSchema = z.object({
  label: z.string().min(1).max(32),
  url: z.string().url().max(200),
});
export type SocialLink = z.infer<typeof socialLinkSchema>;

export const approvedSketchSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  authorName: z.string().nullable(),
  license: z.string().nullable(),
  socialLinks: z.array(socialLinkSchema).nullable(),
  textmodeCode: z.string(),
  strudelCode: z.string().nullable(),
  ogImageUrl: z.string().nullable(),
  createdAt: z.string(),
});
export type ApprovedSketch = z.infer<typeof approvedSketchSchema>;

const publicSketchAccessBaseSchema = z.object({
  id: z.string(),
  slug: z.string(),
  title: z.string(),
  description: z.string().nullable(),
  authorName: z.string().nullable(),
  license: z.string().nullable(),
  textmodeCode: z.string(),
  strudelCode: z.string().nullable(),
  createdAt: z.string(),
});

export const publicApprovedSketchAccessSchema = publicSketchAccessBaseSchema.extend({
  status: z.literal('APPROVED'),
  socialLinks: z.array(socialLinkSchema).nullable(),
  ogImageUrl: z.string().nullable(),
});
export type PublicApprovedSketchAccess = z.infer<typeof publicApprovedSketchAccessSchema>;

export const publicPendingSketchAccessSchema = publicSketchAccessBaseSchema.extend({
  status: z.literal('PENDING'),
});
export type PublicPendingSketchAccess = z.infer<typeof publicPendingSketchAccessSchema>;

export const publicSketchAccessSchema = z.discriminatedUnion('status', [
  publicApprovedSketchAccessSchema,
  publicPendingSketchAccessSchema,
]);
export type PublicSketchAccess = z.infer<typeof publicSketchAccessSchema>;
export const antiSpamChallengeSchema = z.object({
  algorithm: antiSpamAlgorithmSchema,
  challengeId: z.string().regex(/^[a-f0-9]{32}$/),
  difficulty: z.number().int().min(8).max(24),
  expiresAt: z.string(),
  token: z.string().min(32).max(1024),
});
export type AntiSpamChallenge = z.infer<typeof antiSpamChallengeSchema>;

export const antiSpamProofSchema = z.object({
  algorithm: antiSpamAlgorithmSchema,
  challengeId: z.string().regex(/^[a-f0-9]{32}$/),
  nonce: z.string().regex(/^\d{1,12}$/),
  payloadHash: z.string().regex(/^[a-f0-9]{64}$/),
  token: z.string().min(32).max(1024),
});
export type AntiSpamProof = z.infer<typeof antiSpamProofSchema>;

export const sketchRequestHashPayloadSchema = z.object({
  slug: z.string().min(1).max(SLUG_MAX_LENGTH),
  title: z.string().min(1).max(120),
  description: z.string().max(300).nullable(),
  authorName: z.string().max(80).nullable(),
  license: z.string().max(120).nullable(),
  socialLinks: z.array(socialLinkSchema).max(6).nullable(),
  textmodeCode: z.string().min(1).max(300_000),
  strudelCode: z.string().max(300_000).nullable(),
  publishConsent: publishConsentSchema,
});
export type SketchRequestHashPayload = z.infer<typeof sketchRequestHashPayloadSchema>;

export const createSketchRequestSchema = z.object({
  slug: z.string().min(1).max(SLUG_MAX_LENGTH),
  title: z.string().min(1).max(120),
  description: z.string().max(300).optional().nullable(),
  authorName: z.string().max(80).optional().nullable(),
  license: z.string().max(120).optional().nullable(),
  socialLinks: z.array(socialLinkSchema).max(6).optional().nullable(),
  textmodeCode: z.string().min(1).max(300_000),
  strudelCode: z.string().max(300_000).optional().nullable(),
  publishConsent: publishConsentSchema,
  turnstileToken: z.string().min(1).max(4096),
  antiSpam: antiSpamProofSchema,
});
export type SketchRequestPayload = z.infer<typeof createSketchRequestSchema>;

export function toSketchRequestHashPayload(
  payload: Omit<SketchRequestPayload, 'antiSpam'> | SketchRequestPayload
): SketchRequestHashPayload {
  return {
    slug: payload.slug,
    title: payload.title,
    description: payload.description ?? null,
    authorName: payload.authorName ?? null,
    license: payload.license ?? null,
    socialLinks: payload.socialLinks ?? null,
    textmodeCode: payload.textmodeCode,
    strudelCode: payload.strudelCode ?? null,
    publishConsent: payload.publishConsent,
  };
}

export function serializeSketchRequestForAntiSpam(payload: SketchRequestHashPayload): string {
  return JSON.stringify(payload);
}

export const sketchRequestResultSchema = z.object({
  id: z.string(),
  slug: z.string(),
  status: sketchStatusSchema,
  createdAt: z.string(),
});
export type SketchRequestResult = z.infer<typeof sketchRequestResultSchema>;

export const slugAvailabilityResultSchema = z.object({
  available: z.boolean(),
  slug: z.string().max(SLUG_MAX_LENGTH),
  reason: z.string().optional(),
});
export type SlugAvailabilityResult = z.infer<typeof slugAvailabilityResultSchema>;

export const sketchSubmissionQueueStatusSchema = z.object({
  full: z.boolean(),
  publishConsentPolicyVersion: z.string(),
});
export type SketchSubmissionQueueStatus = z.infer<typeof sketchSubmissionQueueStatusSchema>;

export const slugAvailabilityQuerySchema = z.object({
  slug: z.string().min(1).max(SLUG_MAX_LENGTH),
});

export const randomSketchQuerySchema = z.object({
  excludeSlug: z.string().min(1).optional(),
});
