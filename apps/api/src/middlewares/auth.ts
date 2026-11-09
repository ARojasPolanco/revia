import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { envs } from '../config/envs.js';
import { AppError } from '../errors/appError.js';
import { User } from '../modules/users/user.model.js';

export interface AuthUser {
  id: string;
  role: string;
  email: string;
  fullName: string;
  emailVerified: boolean;
  kycStatus: string;
  onboardingCompleted: boolean;
}

interface TokenPayload {
  id: string;
  role: string;
  iat?: number;
  exp?: number;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.revia_at;

  if (typeof cookieToken === 'string' && cookieToken.length > 0) {
    return cookieToken;
  }

  const authorization = req.get('authorization');

  if (authorization?.startsWith('Bearer ')) {
    return authorization.slice(7);
  }

  return null;
}

export async function protect(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const token = extractToken(req);

    if (!token) {
      throw new AppError('Iniciá sesión para continuar.', 401);
    }

    let payload: TokenPayload;

    try {
      payload = jwt.verify(token, envs.JWT_SECRET) as TokenPayload;
    } catch {
      throw new AppError('Tu sesión expiró. Volvé a iniciar sesión.', 401);
    }

    const user = await User.findByPk(payload.id);

    if (!user || user.isDeleted) {
      throw new AppError('Iniciá sesión para continuar.', 401);
    }

    if (user.isSuspended) {
      throw new AppError('Tu cuenta está suspendida. Escribinos a soporte.', 403);
    }

    if (user.passwordChangedAt && payload.iat) {
      const changedAtSeconds = Math.floor(user.passwordChangedAt.getTime() / 1000);

      if (payload.iat < changedAtSeconds) {
        throw new AppError('Tu sesión expiró. Volvé a iniciar sesión.', 401);
      }
    }

    req.user = {
      id: user.id,
      role: user.role,
      email: user.email,
      fullName: user.fullName,
      emailVerified: user.emailVerified,
      kycStatus: user.kycStatus,
      onboardingCompleted: user.onboardingCompleted,
    };

    next();
  } catch (error) {
    next(error);
  }
}

export function restrictTo(...roles: string[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError('Iniciá sesión para continuar.', 401));
      return;
    }

    if (!roles.includes(req.user.role)) {
      next(new AppError('No tenés permisos para esta acción', 403));
      return;
    }

    next();
  };
}

export function requireVerifiedEmail(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Iniciá sesión para continuar.', 401));
    return;
  }

  if (!req.user.emailVerified) {
    next(new AppError('Verificá tu email para continuar', 403));
    return;
  }

  next();
}

export function requireKycApproved(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Iniciá sesión para continuar.', 401));
    return;
  }

  if (req.user.kycStatus !== 'approved') {
    next(new AppError('Necesitás completar la verificación de identidad', 403));
    return;
  }

  next();
}

export function requireOnboardingCompleted(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    next(new AppError('Iniciá sesión para continuar.', 401));
    return;
  }

  if (!req.user.onboardingCompleted) {
    next(new AppError('Completá tu perfil para continuar', 403));
    return;
  }

  next();
}
