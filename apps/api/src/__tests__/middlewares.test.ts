import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it } from 'vitest';
import { AppError } from '../errors/appError.js';
import {
  requireKycApproved,
  requireVerifiedEmail,
  restrictTo,
  type AuthUser,
} from '../middlewares/auth.js';

function makeUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    role: 'user',
    email: 'user@revia.test',
    fullName: 'Usuario Test',
    emailVerified: true,
    kycStatus: 'approved',
    onboardingCompleted: true,
    ...overrides,
  };
}

function run(
  middleware: (req: Request, res: Response, next: NextFunction) => void,
  user: AuthUser | undefined
): unknown {
  const req = { user } as Request;
  let captured: unknown;
  const next = ((error?: unknown) => {
    captured = error;
  }) as NextFunction;

  middleware(req, {} as Response, next);

  return captured;
}

describe('auth middlewares', () => {
  it('restrictTo permite el rol correcto', () => {
    const error = run(restrictTo('admin'), makeUser({ role: 'admin' }));

    expect(error).toBeUndefined();
  });

  it('restrictTo bloquea un rol insuficiente', () => {
    const error = run(restrictTo('admin'), makeUser({ role: 'user' }));

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(403);
  });

  it('requireVerifiedEmail bloquea email sin verificar', () => {
    const error = run(requireVerifiedEmail, makeUser({ emailVerified: false }));

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(403);
  });

  it('requireKycApproved bloquea KYC pendiente', () => {
    const error = run(requireKycApproved, makeUser({ kycStatus: 'pending' }));

    expect(error).toBeInstanceOf(AppError);
    expect((error as AppError).statusCode).toBe(403);
  });
});
