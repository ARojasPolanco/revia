import { z } from 'zod';
import {
  DELIVERY_MODES,
  DISPUTE_REASONS,
  DISPUTE_RESOLUTIONS,
  LISTING_CONDITIONS,
  PAYOUT_METHODS,
  PAYOUT_STATUSES,
  USER_ROLES,
} from './enums.js';

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

export const payoutAccountSchema = z
  .object({
    method: z.enum(PAYOUT_METHODS),
    account: z.string().trim().min(1).max(100),
    holderName: z.string().trim().min(3).max(120),
  })
  .strict();

export const createListingSchema = z
  .object({
    title: z.string().trim().min(5).max(80),
    description: z.string().trim().min(20).max(2000),
    categoryId: uuidSchema,
    condition: listingConditionSchema,
    priceArs: moneyArsSchema,
    deliveryModes: z.array(deliveryModeSchema).min(1),
    midpointFeeArs: z.number().int().min(0).optional(),
    allowOffers: z.boolean().default(true),
    location: z.string().trim().min(2).max(120),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .strict();

export const updateListingSchema = z
  .object({
    title: z.string().trim().min(5).max(80).optional(),
    description: z.string().trim().min(20).max(2000).optional(),
    categoryId: uuidSchema.optional(),
    condition: listingConditionSchema.optional(),
    priceArs: moneyArsSchema.optional(),
    deliveryModes: z.array(deliveryModeSchema).min(1).optional(),
    midpointFeeArs: z.number().int().min(0).optional(),
    allowOffers: z.boolean().optional(),
    location: z.string().trim().min(2).max(120).optional(),
    attributes: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
  })
  .strict();

export const reportListingSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const rejectListingSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const listListingsQuerySchema = z
  .object({
    q: z.string().trim().max(100).optional(),
    categoryId: uuidSchema.optional(),
    condition: listingConditionSchema.optional(),
    minPrice: z.coerce.number().int().min(0).optional(),
    maxPrice: z.coerce.number().int().min(0).optional(),
    delivery: deliveryModeSchema.optional(),
    sort: z.enum(['recent', 'price_asc', 'price_desc']).default('recent'),
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(50).default(20),
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

export const orderQuoteSchema = z
  .object({
    listingId: uuidSchema,
    offerId: uuidSchema.optional(),
    couponId: uuidSchema.optional(),
    deliveryMode: deliveryModeSchema,
  })
  .strict();

export const deliveryCodeSchema = z
  .object({
    code: z
      .string()
      .trim()
      .regex(/^\d{6}$/, 'El código debe tener 6 dígitos.'),
  })
  .strict();

export const payoutPaidSchema = z
  .object({
    operationId: z.string().trim().min(3).max(100),
    receiptUrl: z.string().url().max(500).optional(),
    note: z.string().trim().max(500).optional(),
  })
  .strict();

export const payoutFailedSchema = z
  .object({
    reason: z.string().trim().min(5).max(500),
  })
  .strict();

export const payoutListQuerySchema = z
  .object({
    status: z.enum(PAYOUT_STATUSES).optional(),
  })
  .strict();

export const openDisputeSchema = z
  .object({
    reason: z.enum(DISPUTE_REASONS),
    description: z.string().trim().min(20).max(2000),
  })
  .strict();

export const disputeMessageSchema = z
  .object({
    body: z.string().trim().min(1).max(2000),
  })
  .strict();

export const disputeEvidenceSchema = z
  .object({
    kind: z.enum(['image', 'video', 'text', 'link']),
    url: z.string().url().max(1000).optional(),
    body: z.string().trim().min(1).max(2000).optional(),
  })
  .strict()
  .refine((value) => Boolean(value.url) || Boolean(value.body), {
    message: 'Agregá un enlace o una descripción.',
  });

export const disputeOfferSchema = z
  .object({
    type: z.enum(['partial_refund', 'cover_return']),
    amountArs: moneyArsSchema.optional(),
  })
  .strict()
  .refine((value) => value.type !== 'partial_refund' || typeof value.amountArs === 'number', {
    message: 'Indicá el monto del reembolso parcial.',
  });

export const resolveDisputeSchema = z
  .object({
    resolution: z.enum(DISPUTE_RESOLUTIONS),
    notes: z.string().trim().max(2000).optional(),
    amountArs: moneyArsSchema.optional(),
  })
  .strict();

export const createReviewSchema = z
  .object({
    rating: z.number().int().min(1).max(5),
    comment: z.string().trim().max(1000).optional(),
  })
  .strict();
