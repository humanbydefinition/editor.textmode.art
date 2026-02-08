import { z } from 'zod';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '../.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  HOST: z.string().default('0.0.0.0'),
  PORT: z.coerce.number().default(3000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  ADMIN_API_TOKEN: z.string().min(1, 'ADMIN_API_TOKEN is required'),
  STATIC_DIR: z.string().optional(),
  PUBLIC_BASE_URL: z.string().url().optional(),
  RUNNER_PUBLIC_URL: z.string().url().optional(),
  VITE_DEV_SERVER_URL: z.string().url().optional(),
  ANTI_SPAM_SECRET: z.string().min(32).optional(),
  ANTI_SPAM_POW_DIFFICULTY: z.coerce.number().int().min(8).max(24).default(14),
  ANTI_SPAM_CHALLENGE_TTL_SECONDS: z.coerce.number().int().min(30).max(900).default(180),
  ANTI_SPAM_MAX_CHALLENGES_PER_MINUTE: z.coerce.number().int().min(10).max(5000).default(600),
  ANTI_SPAM_MAX_SUBMISSIONS_PER_MINUTE: z.coerce.number().int().min(1).max(500).default(60),
  ANTI_SPAM_MAX_PENDING_REQUESTS: z.coerce.number().int().min(10).max(100000).default(5000),
  ANTI_SPAM_IDEMPOTENCY_TTL_SECONDS: z.coerce.number().int().min(30).max(3600).default(600),
});

export type Env = z.infer<typeof envSchema>;

const parsedEnv = envSchema.parse(process.env);

if (parsedEnv.NODE_ENV === 'production' && !parsedEnv.ANTI_SPAM_SECRET) {
  throw new Error('ANTI_SPAM_SECRET must be set in production and be at least 32 characters long.');
}

export const env: Env = {
  ...parsedEnv,
  ANTI_SPAM_SECRET: parsedEnv.ANTI_SPAM_SECRET ?? `${parsedEnv.ADMIN_API_TOKEN}:anti-spam-dev-secret`,
};
