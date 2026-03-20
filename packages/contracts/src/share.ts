import { z } from 'zod';

export const sharePayloadSchema = z.object({
  v: z.literal(1),
  createdAt: z.number(),
  code: z.string(),
});
export type SharePayload = z.infer<typeof sharePayloadSchema>;
