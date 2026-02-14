import dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Load variables from the repository root .env.
dotenv.config({ path: path.resolve(import.meta.dirname, '..', '..', '.env') });

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        // Allow `prisma generate` in CI/typecheck jobs that don't provide a live DB URL.
        // Real DB operations (migrate/deploy/studio) will still fail fast at connection time
        // if DATABASE_URL is missing or invalid.
        url: process.env.DATABASE_URL ?? 'postgresql://user:pass@localhost:5432/synth_textmode',
    },
});
