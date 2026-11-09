import { UniqueConstraintError, ValidationError as SequelizeValidationError } from 'sequelize';
import { ZodError } from 'zod';
import { AppError } from './appError.js';

interface PostgresError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

export function matchError(error: unknown): AppError | null {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    const message = error.issues
      .map((issue) => `${issue.path.join('.') || 'body'}: ${issue.message}`)
      .join('; ');
    return new AppError(message || 'Datos inválidos', 422);
  }

  if (error instanceof UniqueConstraintError) {
    return new AppError('Ya existe un registro con esos datos', 409);
  }

  if (error instanceof SequelizeValidationError) {
    return new AppError(
      error.errors.map((item) => item.message).join('; ') || 'Datos inválidos',
      422
    );
  }

  const errorName = error instanceof Error ? error.name : '';

  if (errorName === 'TokenExpiredError') {
    return new AppError('La sesión expiró', 401);
  }

  if (errorName === 'JsonWebTokenError') {
    return new AppError('Token inválido', 401);
  }

  const postgresError = error as PostgresError;

  if (postgresError?.code === '23505') {
    return new AppError('Ya existe un registro con esos datos', 409);
  }

  if (postgresError?.code === '23503') {
    return new AppError('Referencia inválida', 409);
  }

  if (postgresError?.code === '23502') {
    return new AppError('Falta un dato obligatorio', 400);
  }

  if (postgresError?.code === '22P02') {
    return new AppError('Formato inválido', 400);
  }

  return null;
}
