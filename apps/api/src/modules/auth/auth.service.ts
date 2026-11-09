import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import type { SignOptions } from 'jsonwebtoken';
import type { z } from 'zod';
import {
  completeOnboardingSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '@revia/shared';
import { envs, isProduction } from '../../config/envs.js';
import { sequelize } from '../../config/database.js';
import { AppError } from '../../errors/appError.js';
import { sendPasswordResetEmail, sendVerificationEmail } from '../notifications/email.service.js';
import { generateToken, hashToken } from '../../utils/tokens.js';
import { verifyHcaptcha } from '../../utils/hcaptcha.js';
import { AuthIdentity } from './authIdentity.model.js';
import { EmailVerificationToken } from './emailVerificationToken.model.js';
import { PasswordResetToken } from './passwordResetToken.model.js';
import { User } from '../users/user.model.js';

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type CompleteOnboardingInput = z.infer<typeof completeOnboardingSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export interface SelfUser {
  id: string;
  email: string;
  fullName: string;
  birthDate: string | null;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  role: string;
  emailVerified: boolean;
  kycStatus: string;
  onboardingCompleted: boolean;
  sellerVerified: boolean;
  createdAt: Date;
}

export interface PublicUser {
  id: string;
  fullName: string;
  bio: string | null;
  location: string | null;
  avatarUrl: string | null;
  sellerVerified: boolean;
  createdAt: Date;
}

function calculateAge(birthDate: string): number {
  const birth = new Date(`${birthDate}T00:00:00.000Z`);
  const today = new Date();
  let age = today.getUTCFullYear() - birth.getUTCFullYear();
  const monthDiff = today.getUTCMonth() - birth.getUTCMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getUTCDate() < birth.getUTCDate())) {
    age -= 1;
  }

  return age;
}

function assertAdult(birthDate: string): void {
  if (calculateAge(birthDate) < 18) {
    throw new AppError('Tenés que ser mayor de 18 años para usar REVIA', 422);
  }
}

export function toSelfUser(user: User): SelfUser {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    birthDate: user.birthDate,
    bio: user.bio,
    location: user.location,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerified: user.emailVerified,
    kycStatus: user.kycStatus,
    onboardingCompleted: user.onboardingCompleted,
    sellerVerified: Boolean(user.sellerVerifiedAt),
    createdAt: user.createdAt,
  };
}

export function toPublicUser(user: User): PublicUser {
  return {
    id: user.id,
    fullName: user.fullName,
    bio: user.bio,
    location: user.location,
    avatarUrl: user.avatarUrl,
    sellerVerified: Boolean(user.sellerVerifiedAt),
    createdAt: user.createdAt,
  };
}

function signToken(user: User): string {
  const options: SignOptions = {
    expiresIn: envs.JWT_EXPIRES_IN as SignOptions['expiresIn'],
  };

  return jwt.sign({ id: user.id, role: user.role }, envs.JWT_SECRET, options);
}

async function createEmailVerificationToken(userId: string): Promise<string> {
  await EmailVerificationToken.update({ usedAt: new Date() }, { where: { userId, usedAt: null } });

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  await EmailVerificationToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  return rawToken;
}

async function createPasswordResetToken(userId: string): Promise<string> {
  await PasswordResetToken.update({ usedAt: new Date() }, { where: { userId, usedAt: null } });

  const rawToken = generateToken();
  const tokenHash = hashToken(rawToken);

  await PasswordResetToken.create({
    userId,
    tokenHash,
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  });

  return rawToken;
}

export async function register(input: RegisterInput): Promise<{
  user: User;
  verificationToken: string;
}> {
  assertAdult(input.birthDate);
  await verifyHcaptcha(input.hcaptchaToken);

  const existing = await User.findOne({
    where: { email: input.email, isDeleted: false },
  });

  if (existing) {
    throw new AppError('Ya existe una cuenta con ese email', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);

  const user = await User.create({
    email: input.email,
    passwordHash,
    fullName: input.fullName,
    birthDate: input.birthDate,
    role: 'user',
    emailVerified: false,
    acceptedTermsAt: new Date(),
    onboardingCompleted: true,
  });

  const verificationToken = await createEmailVerificationToken(user.id);
  await sendVerificationEmail({
    to: user.email,
    name: user.fullName,
    token: verificationToken,
  });

  return { user, verificationToken };
}

export async function login(input: LoginInput): Promise<{ user: User; token: string }> {
  const user = await User.findOne({
    where: { email: input.email, isDeleted: false },
  });

  if (!user) {
    throw new AppError('Email o contraseña incorrectos', 401);
  }

  if (user.isSuspended) {
    throw new AppError('Tu cuenta está suspendida. Escribinos a soporte.', 403);
  }

  if (!user.passwordHash) {
    throw new AppError('Esta cuenta usa Google. Iniciá sesión con Google.', 400);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.passwordHash);

  if (!passwordMatches) {
    throw new AppError('Email o contraseña incorrectos', 401);
  }

  await user.update({ lastLoginAt: new Date() });

  return { user, token: signToken(user) };
}

export async function verifyEmail(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);

  const record = await EmailVerificationToken.findOne({
    where: { tokenHash, usedAt: null },
  });

  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new AppError('El link de verificación es inválido o venció', 400);
  }

  await sequelize.transaction(async (transaction) => {
    await record.update({ usedAt: new Date() }, { transaction });
    await User.update(
      { emailVerified: true, emailVerifiedAt: new Date() },
      { where: { id: record.userId }, transaction }
    );
  });
}

export async function resendVerification(userId: string): Promise<string> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('Iniciá sesión para continuar.', 401);
  }

  if (user.emailVerified) {
    throw new AppError('Tu email ya está verificado', 400);
  }

  const token = await createEmailVerificationToken(user.id);
  await sendVerificationEmail({
    to: user.email,
    name: user.fullName,
    token,
  });

  return token;
}

export async function forgotPassword(email: string): Promise<string | null> {
  const user = await User.findOne({
    where: { email, isDeleted: false },
  });

  if (!user) {
    return null;
  }

  const token = await createPasswordResetToken(user.id);
  await sendPasswordResetEmail({
    to: user.email,
    name: user.fullName,
    token,
  });

  return token;
}

export async function resetPassword(rawToken: string, newPassword: string): Promise<void> {
  const tokenHash = hashToken(rawToken);

  const record = await PasswordResetToken.findOne({
    where: { tokenHash, usedAt: null },
  });

  if (!record || record.expiresAt.getTime() < Date.now()) {
    throw new AppError('El link de recuperación es inválido o venció', 400);
  }

  const passwordHash = await bcrypt.hash(newPassword, 12);

  await sequelize.transaction(async (transaction) => {
    await PasswordResetToken.update(
      { usedAt: new Date() },
      { where: { userId: record.userId, usedAt: null }, transaction }
    );
    await User.update(
      {
        passwordHash,
        passwordChangedAt: new Date(),
      },
      { where: { id: record.userId }, transaction }
    );
  });
}

export async function completeOnboarding(
  userId: string,
  input: CompleteOnboardingInput
): Promise<User> {
  assertAdult(input.birthDate);

  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('Iniciá sesión para continuar.', 401);
  }

  await user.update({
    birthDate: input.birthDate,
    acceptedTermsAt: new Date(),
    onboardingCompleted: true,
  });

  return user;
}

export async function updateProfile(userId: string, input: UpdateProfileInput): Promise<User> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('Iniciá sesión para continuar.', 401);
  }

  await user.update({
    ...(input.fullName !== undefined ? { fullName: input.fullName } : {}),
    ...(input.bio !== undefined ? { bio: input.bio } : {}),
    ...(input.location !== undefined ? { location: input.location } : {}),
    ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
  });

  return user;
}

export async function loginWithGoogle(profile: GoogleProfile): Promise<{
  user: User;
  token: string;
  isNewUser: boolean;
}> {
  const identity = await AuthIdentity.findOne({
    where: { provider: 'google', providerUserId: profile.sub },
  });

  let user: User | null = null;
  let isNewUser = false;

  if (identity) {
    user = await User.findByPk(identity.userId);
  } else {
    user = await User.findOne({
      where: { email: profile.email, isDeleted: false },
    });

    if (user) {
      await AuthIdentity.create({
        userId: user.id,
        provider: 'google',
        providerUserId: profile.sub,
      });

      if (profile.emailVerified && !user.emailVerified) {
        await user.update({
          emailVerified: true,
          emailVerifiedAt: new Date(),
        });
      }
    } else {
      user = await User.create({
        email: profile.email,
        passwordHash: null,
        fullName: profile.name?.trim() || profile.email.split('@')[0] || 'Usuario REVIA',
        birthDate: null,
        role: 'user',
        emailVerified: profile.emailVerified,
        emailVerifiedAt: profile.emailVerified ? new Date() : null,
        acceptedTermsAt: null,
        onboardingCompleted: false,
        avatarUrl: profile.picture ?? null,
      });

      await AuthIdentity.create({
        userId: user.id,
        provider: 'google',
        providerUserId: profile.sub,
      });

      isNewUser = true;
    }
  }

  if (!user || user.isDeleted) {
    throw new AppError('No se pudo iniciar sesión con Google', 401);
  }

  if (user.isSuspended) {
    throw new AppError('Tu cuenta está suspendida. Escribinos a soporte.', 403);
  }

  await user.update({ lastLoginAt: new Date() });

  return { user, token: signToken(user), isNewUser };
}

export async function getMe(userId: string): Promise<User> {
  const user = await User.findByPk(userId);

  if (!user || user.isDeleted) {
    throw new AppError('Iniciá sesión para continuar.', 401);
  }

  return user;
}

export function canExposeDevToken(): boolean {
  return !isProduction;
}
