import { createApp } from './bootstrap.js';
import { logger, env } from '@template/shared';
import { disposeModules } from './load-modules.js';

const SHUTDOWN_TIMEOUT_MS = 10_000;

const withTimeout = async (label: string, fn: () => Promise<void>): Promise<void> => {
  await Promise.race([
    fn(),
    new Promise<void>((_, reject) =>
      setTimeout(
        () => reject(new Error(`${label} timed out after ${SHUTDOWN_TIMEOUT_MS}ms`)),
        SHUTDOWN_TIMEOUT_MS,
      ),
    ),
  ]);
};

const start = async (): Promise<void> => {
  const { app, loadedModules, resources } = await createApp();

  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'Server listening');
  });

  server.on('error', (err) => {
    logger.error({ err }, 'Server failed to start');
    process.exit(1);
  });

  let shuttingDown = false;

  const shutdown = async (signal: string): Promise<void> => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ signal }, 'Shutdown initiated');

    try {
      await withTimeout('server.close', () => {
        return new Promise<void>((resolve, reject) => {
          server.close((err) => (err ? reject(err) : resolve()));
        });
      });

      // Modules first — their dispose() may still touch prisma/messageBroker,
      // so root resources must outlive them.
      await withTimeout('disposeModules', () => disposeModules(loadedModules));

      // Root resources (prisma, messageBroker) last.
      await withTimeout('resources.dispose', () => resources.dispose());

      logger.info({ signal }, 'Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err, signal }, 'Shutdown failed or timed out — forcing exit');
      process.exit(1);
    }
  };

  process.on('SIGTERM', () => void shutdown('SIGTERM'));
  process.on('SIGINT', () => void shutdown('SIGINT'));

  // Node's own guidance: process state after either of these is unknown.
  // Log synchronously and exit immediately — no async cleanup attempts.
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection — exiting');
    process.exit(1);
  });

  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception — exiting');
    process.exit(1);
  });
};

start().catch((err) => {
  // logger may not be safe to trust if createApp itself failed during
  // container/prisma setup, so fall back to console as a last resort.
  console.error('Fatal error during startup', err);
  process.exit(1);
});
