import { z } from 'zod';

export const contactFormSchema = z.object({
    name: z.string().min(1, 'Name is required').max(100),
    email: z.string().email('Invalid email address').max(255),
    subject: z.string().min(1, 'Subject is required').max(200),
    message: z.string().min(1, 'Message is required').max(5000),
    turnstileToken: z.string().min(1, 'Security verification is required'),
});

export type ContactFormPayload = z.infer<typeof contactFormSchema>;

export const contactResponseSchema = z.object({
    success: z.boolean(),
    message: z.string().optional(),
    error: z.string().optional(),
});

export type ContactResponse = z.infer<typeof contactResponseSchema>;
