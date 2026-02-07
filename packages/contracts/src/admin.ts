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
  strudelCode: z.string().nullable(),
  ogImageUrl: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  reviewedAt: z.string().nullable(),
  reviewedBy: z.string().nullable(),
  denialReason: z.string().nullable(),
});
export type AdminSketchRequest = z.infer<typeof adminSketchRequestSchema>;

export const adminSketchListResponseSchema = z.object({
  items: z.array(adminSketchRequestSchema),
});
export type AdminSketchListResponse = z.infer<typeof adminSketchListResponseSchema>;
