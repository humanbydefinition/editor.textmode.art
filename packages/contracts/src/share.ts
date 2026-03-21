import { z } from 'zod';

export const sharePayloadV1Schema = z.object({
	v: z.literal(1),
	createdAt: z.number(),
	engines: z.object({
		textmode: z.string().optional(),
	}),
});

export type SharePayloadV1 = z.infer<typeof sharePayloadV1Schema>;
export type SharePayload = SharePayloadV1;
