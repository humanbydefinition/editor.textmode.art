import { buildServer } from './app';
import { env } from './config/env';

async function start() {
  const app = buildServer();

  try {
    await app.listen({ port: env.PORT, host: env.HOST });
  } catch (error) {
    app.log.error(error, 'Failed to start server');
    process.exit(1);
  }
}

void start();
