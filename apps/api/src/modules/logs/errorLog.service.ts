import { sequelize } from '../../config/database.js';
import { logger } from '../../config/logger.js';

interface ErrorLogInput {
  statusCode: number;
  status: string;
  message: string;
  stack?: string;
  path?: string;
  method?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

function redact(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  return value
    .replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[email]')
    .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [token]')
    .slice(0, 4_000);
}

export async function logUnexpectedError(input: ErrorLogInput): Promise<void> {
  try {
    await sequelize.query(
      `INSERT INTO errors
        (status_code, status, message, stack, path, method, user_id, ip, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      {
        bind: [
          input.statusCode,
          input.status,
          redact(input.message),
          redact(input.stack),
          input.path ?? null,
          input.method ?? null,
          input.userId ?? null,
          input.ip ?? null,
          redact(input.userAgent),
        ],
      }
    );
  } catch (error) {
    logger.error('No se pudo persistir el error', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
