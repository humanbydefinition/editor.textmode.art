import dotenv from 'dotenv';
import path from 'node:path';
import { defineConfig, env } from 'prisma/config';

// Load variables from the root .env (one level above server/).
dotenv.config({ path: path.resolve(import.meta.dirname, '..', '.env') });

export default defineConfig({
    schema: 'prisma/schema.prisma',
    migrations: {
        path: 'prisma/migrations',
    },
    datasource: {
        url: env('DATABASE_URL'),
    },
});
