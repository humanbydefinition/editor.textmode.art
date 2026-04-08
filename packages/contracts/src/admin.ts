import { z } from 'zod';
import { sketchStatusSchema, socialLinkSchema } from './sketch.js';

export const adminQueryStatusSchema = z.object({
  status: z.string().optional(),
});
export type AdminQueryStatus = z.infer<typeof adminQueryStatusSchema>;

export const adminUpdateSchema = z.object({
  status: z.enum(['APPROVED', 'DENIED']),
  denialReason: z.string().max(300).optional().nullable(),
  reviewedBy: z.string().max(80).optional().nullable(),
});
export type AdminUpdateRequestPayload = z.infer<typeof adminUpdateSchema>;

export const adminRegeneratePreviewSchema = z.object({
  captureAtFrame: z.coerce.number().int().min(1).max(1000).optional(),
});
export type AdminRegeneratePreviewPayload = z.infer<typeof adminRegeneratePreviewSchema>;

export const adminSessionResponseSchema = z.object({
  authenticated: z.literal(true),
  serverTime: z.string(),
});
export type AdminSessionResponse = z.infer<typeof adminSessionResponseSchema>;

export const adminSketchRequestSchema = z.object({
  id: z.string(),
  slug: z.string(),
  status: sketchStatusSchema,
  title: z.string(),
  description: z.string().nullable(),
  authorName: z.string().nullable(),
  license: z.string().nullable(),
  socialLinks: z.array(socialLinkSchema).nullable(),
  textmodeCode: z.string(),
  ogImageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  denialReason: z.string().nullable(),
  publishConsentAccepted: z.boolean().optional(),
  publishConsentAcceptedAt: z.string().nullable().optional(),
  publishConsentPolicyVersion: z.string().nullable().optional(),
});
export type AdminSketchRequest = z.infer<typeof adminSketchRequestSchema>;

export const adminSketchListResponseSchema = z.object({
  items: z.array(adminSketchRequestSchema),
});
export type AdminSketchListResponse = z.infer<typeof adminSketchListResponseSchema>;
