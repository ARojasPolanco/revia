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

const FIELD_LABELS: Record<string, string> = {
  email: 'email',
  password: 'contraseña',
  fullName: 'nombre completo',
  birthDate: 'fecha de nacimiento',
  acceptTerms: 'aceptación de términos',
  bio: 'bio',
  location: 'ubicación',
  avatarUrl: 'foto de perfil',
  account: 'cuenta',
  holderName: 'titular de la cuenta',
  method: 'método de cobro',
  token: 'enlace',
  listingId: 'publicación',
  offerId: 'oferta',
  deliveryMode: 'modalidad de entrega',
  couponId: 'cupón',
  status: 'estado',
  title: 'título',
  description: 'descripción',
  categoryId: 'categoría',
  subcategoryId: 'subcategoría',
  condition: 'estado del artículo',
  priceArs: 'precio',
  deliveryModes: 'modalidades de entrega',
  midpointFeeArs: 'tarifa de punto medio',
  allowOffers: 'opción de ofertas',
  attributes: 'atributos',
  amountArs: 'monto',
  page: 'página',
  limit: 'límite',
  hcaptchaToken: 'verificación de seguridad',
  avatar: 'foto de perfil',
};

function fieldName(path: (string | number)[]): string {
  const last = path[path.length - 1];

  if (last === undefined) {
    return 'los datos';
  }

  return FIELD_LABELS[String(last)] ?? 'un campo';
}

function formatZodIssue(issue: ZodIssue): string {
  const field = fieldName(issue.path);
  const lastKey = String(issue.path[issue.path.length - 1] ?? '');

  if (lastKey === 'acceptTerms') {
    return 'Tenés que aceptar los términos y condiciones.';
  }

  switch (issue.code) {
    case 'invalid_type':
      return issue.received === 'undefined'
        ? `Falta completar: ${field}.`
        : `Revisá el campo ${field}.`;
    case 'too_small':
      if (issue.type === 'string') {
        return `El campo ${field} debe tener al menos ${issue.minimum} caracteres.`;
      }

      if (issue.type === 'array') {
        return `Elegí al menos ${issue.minimum} opciones en ${field}.`;
      }

      return `El valor de ${field} es demasiado bajo.`;
    case 'too_big':
      if (issue.type === 'string') {
        return `El campo ${field} debe tener como máximo ${issue.maximum} caracteres.`;
      }

      if (issue.type === 'array') {
        return `Elegí como máximo ${issue.maximum} opciones en ${field}.`;
      }

      return `El valor de ${field} es demasiado alto.`;
    case 'invalid_string':
      if (issue.validation === 'email') {
        return 'Ingresá un email válido.';
      }

      if (issue.validation === 'uuid') {
        return 'No encontramos lo que buscabas.';
      }

      if (issue.validation === 'date') {
        return 'Ingresá una fecha válida.';
      }

      if (issue.validation === 'url') {
        return 'Ingresá una dirección web válida.';
      }

      return `Revisá el formato del campo ${field}.`;
    case 'invalid_enum_value':
      return `Elegí una opción válida para ${field}.`;
    case 'invalid_literal':
      return `Revisá el campo ${field}.`;
    case 'unrecognized_keys':
      return 'La solicitud incluye datos no permitidos.';
    case 'invalid_union':
      return `Revisá el campo ${field}.`;
    default:
      return `Revisá el campo ${field}.`;
  }
}

export function matchError(error: unknown): AppError | null {
  if (error instanceof AppError) {
    return error;
  }

  if (error instanceof ZodError) {
    const isMissing = (issue: ZodIssue) =>
      issue.code === 'invalid_type' && issue.received === 'undefined';
    const isAcceptTerms = (issue: ZodIssue) =>
      String(issue.path[issue.path.length - 1] ?? '') === 'acceptTerms';
    const missing = error.issues
      .filter((issue) => isMissing(issue) && !isAcceptTerms(issue))
      .map((issue) => fieldName(issue.path));
    const others = error.issues
      .filter((issue) => !isMissing(issue) || isAcceptTerms(issue))
      .map(formatZodIssue);
    const parts: string[] = [];

    if (missing.length === 1) {
      parts.push(`Falta completar: ${missing[0]}.`);
    } else if (missing.length > 1) {
      parts.push(`Faltan completar: ${missing.join(', ')}.`);
    }

    parts.push(...others);

    return new AppError(parts.join(' ') || 'Revisá los datos ingresados.', 422);
  }

  if (error instanceof UniqueConstraintError) {
    return new AppError('Esos datos ya están en uso.', 409);
  }

  if (error instanceof SequelizeValidationError) {
    return new AppError('Revisá los datos ingresados.', 422);
  }

  const errorName = error instanceof Error ? error.name : '';
  const bodyParserError = error as BodyParserError;

  if (bodyParserError?.type === 'entity.parse.failed') {
    return new AppError('No pudimos procesar la solicitud. Probá de nuevo.', 400);
  }

  if (bodyParserError?.type === 'entity.too.large') {
    return new AppError('Los datos que enviaste son demasiado grandes.', 413);
  }

  if (errorName === 'MulterError') {
    const code = (error as { code?: string }).code;

    if (code === 'LIMIT_FILE_SIZE') {
      return new AppError('La imagen es demasiado grande. El máximo es 5 MB.', 422);
    }

    return new AppError('No pudimos subir la imagen. Probá con otra.', 422);
  }

  if (errorName === 'SequelizeForeignKeyConstraintError') {
    return new AppError('No pudimos completar la operación porque falta un dato relacionado.', 409);
  }

  if (errorName === 'SequelizeConnectionError' || errorName === 'SequelizeConnectionRefusedError') {
    return new AppError(
      'El servicio no está disponible en este momento. Probá en unos minutos.',
      503
    );
  }

  if (errorName === 'TokenExpiredError') {
    return new AppError('Tu sesión expiró. Volvé a iniciar sesión.', 401);
  }

  if (errorName === 'JsonWebTokenError') {
    return new AppError('Tu sesión no es válida. Volvé a iniciar sesión.', 401);
  }

  if (error instanceof Error && /not allowed by cors/i.test(error.message)) {
    return new AppError('No pudimos procesar la solicitud desde este sitio.', 403);
  }

  const postgresError = error as PostgresError;

  if (postgresError?.code === '23505') {
    return new AppError('Esos datos ya están en uso.', 409);
  }

  if (postgresError?.code === '23503') {
    return new AppError('No pudimos completar la operación porque falta un dato relacionado.', 409);
  }

  if (postgresError?.code === '23502') {
    return new AppError('Faltan datos obligatorios.', 400);
  }

  if (postgresError?.code === '22P02') {
    return new AppError('Revisá el formato de los datos.', 400);
  }

  return null;
}
