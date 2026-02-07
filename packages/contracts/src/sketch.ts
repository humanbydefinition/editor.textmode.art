import { z } from 'zod';

export const sketchStatusSchema = z.enum(['PENDING', 'APPROVED', 'DENIED']);
export type SketchStatus = z.infer<typeof sketchStatusSchema>;

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

export const createSketchRequestSchema = z.object({
  slug: z.string().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(300).optional().nullable(),
  authorName: z.string().max(80).optional().nullable(),
  license: z.string().max(120).optional().nullable(),
  socialLinks: z.array(socialLinkSchema).max(6).optional().nullable(),
  textmodeCode: z.string().min(1).max(300_000),
  strudelCode: z.string().max(300_000).optional().nullable(),
});
export type SketchRequestPayload = z.infer<typeof createSketchRequestSchema>;

export const sketchRequestResultSchema = z.object({
  id: z.string(),
  slug: z.string(),
  status: sketchStatusSchema,
  createdAt: z.string(),
});
export type SketchRequestResult = z.infer<typeof sketchRequestResultSchema>;

export const slugAvailabilityResultSchema = z.object({
  available: z.boolean(),
  slug: z.string(),
  reason: z.string().optional(),
});
export type SlugAvailabilityResult = z.infer<typeof slugAvailabilityResultSchema>;

export const slugAvailabilityQuerySchema = z.object({
  slug: z.string().min(1),
});

export const randomSketchQuerySchema = z.object({
  excludeSlug: z.string().min(1).optional(),
});
