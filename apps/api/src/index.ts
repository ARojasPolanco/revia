import { app } from './app.js';
import { sequelize } from './config/database.js';
import { envs } from './config/envs.js';
import { logger } from './config/logger.js';

const server = app.listen(envs.PORT, () => {
  logger.info(`REVIA API escuchando en ${envs.API_URL}`, {
    environment: envs.NODE_ENV,
    port: envs.PORT,
  });
});

async function shutdown(signal: string): Promise<void> {
  logger.info(`Cerrando REVIA API por ${signal}`);

  server.close(() => {
    void sequelize
      .close()
      .catch((error: unknown) => {
        logger.error('Error al cerrar la base de datos', {
          error: error instanceof Error ? error.message : String(error),
        });
      })
      .finally(() => process.exit(0));
  });

  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));

process.on('unhandledRejection', (reason) => {
  logger.error('unhandledRejection', { reason: String(reason) });
});

process.on('uncaughtException', (error) => {
  logger.error('uncaughtException', {
    error: error.message,
    stack: error.stack,
  });
  void shutdown('uncaughtException');
});
