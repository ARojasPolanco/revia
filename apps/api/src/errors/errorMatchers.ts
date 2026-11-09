import { UniqueConstraintError, ValidationError as SequelizeValidationError } from 'sequelize';
import { ZodError } from 'zod';
import type { ZodIssue } from 'zod';
import { AppError } from './appError.js';

interface PostgresError extends Error {
  code?: string;
  detail?: string;
  constraint?: string;
}

interface BodyParserError extends SyntaxError {
  type?: string;
  body?: unknown;
}

function formatZodIssue(issue: ZodIssue): string {
  const field = issue.path.join('.') || 'cuerpo';

  switch (issue.code) {
    case 'invalid_type':
      return issue.received === 'undefined'
        ? `${field} es obligatorio`
        : `${field} tiene un tipo inválido`;
    case 'too_small':
      return issue.type === 'string'
        ? `${field} debe tener al menos ${issue.minimum} caracteres`
        : `${field} es demasiado pequeño`;
    case 'too_big':
      return issue.type === 'string'
        ? `${field} debe tener como máximo ${issue.maximum} caracteres`
        : `${field} es demasiado grande`;
    case 'invalid_string':
      if (issue.validation === 'email') {
        return `${field} no es un email válido`;
      }

      if (issue.validation === 'uuid') {
        return `${field} no es un ID válido`;
      }

      if (issue.validation === 'date') {
        return `${field} no es una fecha válida`;
      }

      if (issue.validation === 'url') {
        return `${field} no es una URL válida`;
      }

      return `${field} tiene un formato inválido`;
    case 'invalid_enum_value':
      return `${field} debe ser uno de: ${issue.options.join(', ')}`;
    case 'invalid_literal':
      return `${field} debe ser ${String(issue.expected)}`;
    case 'unrecognized_keys':
      return `El cuerpo contiene campos no permitidos: ${issue.keys.join(', ')}`;
    case 'invalid_union':
      return `${field} no es válido`;
    default:
      return `${field}: ${issue.message}`;
  }
}

export function matchError(error: unknown): AppError | null {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    const message = error.issues.map(formatZodIssue).join('; ');
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
  const bodyParserError = error as BodyParserError;

  if (bodyParserError?.type === 'entity.parse.failed') {
    return new AppError('El cuerpo de la solicitud no es JSON válido', 400);
  }

  if (bodyParserError?.type === 'entity.too.large') {
    return new AppError('El cuerpo de la solicitud es demasiado grande', 413);
  }

  if (errorName === 'MulterError') {
    const code = (error as { code?: string }).code;

    if (code === 'LIMIT_FILE_SIZE') {
      return new AppError('La imagen supera el límite de 5 MB', 422);
    }

    return new AppError('No se pudo subir la imagen', 422);
  }

  if (errorName === 'SequelizeForeignKeyConstraintError') {
    return new AppError('Referencia inválida', 409);
  }

  if (errorName === 'SequelizeConnectionError' || errorName === 'SequelizeConnectionRefusedError') {
    return new AppError('Servicio temporalmente no disponible', 503);
  }

  if (errorName === 'TokenExpiredError') {
    return new AppError('La sesión expiró', 401);
  }

  if (errorName === 'JsonWebTokenError') {
    return new AppError('Token inválido', 401);
  }

  if (error instanceof Error && /not allowed by cors/i.test(error.message)) {
    return new AppError('Origen no permitido', 403);
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
