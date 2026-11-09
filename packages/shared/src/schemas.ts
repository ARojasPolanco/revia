import { z } from 'zod';
import { DELIVERY_MODES, LISTING_CONDITIONS, USER_ROLES } from './enums.js';

export const uuidSchema = z.string().uuid();

export const emailSchema = z.string().trim().toLowerCase().email().max(254);

export const passwordSchema = z.string().min(10).max(128);

export const moneyArsSchema = z.number().int().positive().max(1_000_000_000);

export const paginationSchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
  })
  .strict();

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    fullName: z.string().trim().min(2).max(80),
    birthDate: z.string().date(),
    acceptTerms: z.literal(true),
    hcaptchaToken: z.string().optional(),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1).max(128),
  })
  .strict();

export const verifyEmailSchema = z
  .object({
    token: z.string().min(10).max(256),
  })
  .strict();

export const forgotPasswordSchema = z
  .object({
    email: emailSchema,
  })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().min(10).max(256),
    password: passwordSchema,
  })
  .strict();

export const completeOnboardingSchema = z
  .object({
    birthDate: z.string().date(),
    acceptTerms: z.literal(true),
  })
  .strict();

export const userRoleSchema = z.enum(USER_ROLES);

export const listingConditionSchema = z.enum(LISTING_CONDITIONS);

export const deliveryModeSchema = z.enum(DELIVERY_MODES);

export const updateProfileSchema = z
  .object({
    fullName: z.string().trim().min(2).max(80).optional(),
    bio: z.string().trim().max(500).optional(),
    location: z.string().trim().max(120).optional(),
    avatarUrl: z.string().url().max(500).optional(),
  })
  .strict();

export const createListingSchema = z
  .object({
    title: z.string().trim().min(5).max(80),
    description: z.string().trim().min(20).max(2000),
    categoryId: uuidSchema,
    subcategoryId: uuidSchema.optional(),
    condition: listingConditionSchema,
    priceArs: moneyArsSchema,
    deliveryModes: z.array(deliveryModeSchema).min(1),
    midpointFeeArs: z.number().int().min(0).optional(),
    allowOffers: z.boolean().default(true),
    location: z.string().trim().min(2).max(120),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .strict();

export const createOfferSchema = z
  .object({
    amountArs: moneyArsSchema,
  })
  .strict();

export const createOrderSchema = z
  .object({
    listingId: uuidSchema,
    offerId: uuidSchema.optional(),
    deliveryMode: deliveryModeSchema,
    couponId: uuidSchema.optional(),
  })
  .strict();
