import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SequelizeStorage, Umzug } from 'umzug';
import { sequelize } from './database.js';
import { logger } from './logger.js';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const migrationsDir = path.resolve(currentDir, '../../migrations');

interface SqlMigration {
  name: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

function buildMigrations(): SqlMigration[] {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir)
    .filter((file) => file.endsWith('.up.sql'))
    .sort()
    .map((file) => {
      const name = file.replace(/\.up\.sql$/, '');
      const upSql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
      const downFile = path.join(migrationsDir, `${name}.down.sql`);
      const downSql = fs.existsSync(downFile) ? fs.readFileSync(downFile, 'utf8') : undefined;

      return {
        name,
        up: async () => {
          await sequelize.query(upSql);
        },
        down: async () => {
          if (downSql) {
            await sequelize.query(downSql);
          }
        },
      };
    });
}

export const migrator = new Umzug({
  migrations: buildMigrations(),
  storage: new SequelizeStorage({ sequelize }),
  logger: {
    info: (message) => logger.info('migrator', { message: String(message) }),
    warn: (message) => logger.warn('migrator', { message: String(message) }),
    error: (message) => logger.error('migrator', { message: String(message) }),
    debug: () => undefined,
  },
});

export async function migrateUp(): Promise<void> {
  await migrator.up();
}

export async function migrateDown(): Promise<void> {
  await migrator.down();
}

async function runCli(): Promise<void> {
  const command = process.argv[2] ?? 'up';

  try {
    if (command === 'down') {
      logger.info('Ejecutando migraciones down');
      await migrateDown();
    } else {
      logger.info('Ejecutando migraciones up');
      await migrateUp();
    }

    await sequelize.close();
    process.exit(0);
  } catch (error) {
    logger.error('Falló la migración', {
      error: error instanceof Error ? error.message : String(error),
    });
    await sequelize.close().catch(() => undefined);
    process.exit(1);
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invokedPath === fileURLToPath(import.meta.url)) {
  void runCli();
}
