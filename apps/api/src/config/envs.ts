import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  APP_URL: z.string().url().default('http://localhost:3000'),
  API_URL: z.string().url().default('http://localhost:4000'),
  CORS_ORIGINS: z.string().default('http://localhost:3000'),

  DB_URI: z.string().min(1).default('postgres://revia:revia@localhost:5433/revia'),
  TEST_DB_URI: z.string().min(1).default('postgres://revia:revia@localhost:5433/revia_test'),

  JWT_SECRET: z.string().min(16).default('dev-secret-change-me-please'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  COOKIE_DOMAIN: z.string().optional(),
  COOKIE_SECURE: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),

  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z
    .string()
    .url()
    .default('http://localhost:4000/api/v1/auth/google/callback'),

  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default('REVIA <no-reply@revia.com.ar>'),

  HCAPTCHA_ENABLED: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
  HCAPTCHA_SECRET: z.string().optional(),

  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().optional(),
  R2_PUBLIC_URL: z.string().url().optional(),

  TALO_USER_ID: z.string().optional(),
  TALO_API_KEY: z.string().optional(),
  TALO_API_URL: z.string().url().default('https://api.talo.com.ar'),
  TALO_WEBHOOK_SECRET: z.string().optional(),

  DIDIT_API_KEY: z.string().optional(),
  DIDIT_WEBHOOK_SECRET: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default('mailto:soporte@revia.com.ar'),

  PAYOUT_ENCRYPTION_KEY: z.string().optional(),

  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Variables de entorno inválidas:', parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const envs = parsed.data;

export const corsOrigins = envs.CORS_ORIGINS.split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const isProduction = envs.NODE_ENV === 'production';
export const isTest = envs.NODE_ENV === 'test';
