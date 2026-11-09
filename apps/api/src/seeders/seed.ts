import bcrypt from 'bcryptjs';
import { DEFAULTS } from '@revia/shared';
import { envs } from '../config/envs.js';
import { logger } from '../config/logger.js';
import { sequelize } from '../config/database.js';
import { Category } from '../modules/categories/category.model.js';
import { Listing } from '../modules/listings/listing.model.js';
import { ListingPhoto } from '../modules/listings/listingPhoto.model.js';
import { User } from '../modules/users/user.model.js';
import { seedCategories } from './categories.js';

const DEMO_PASSWORD = 'revia12345';

interface DemoUser {
  email: string;
  fullName: string;
  role?: string;
  onboardingCompleted?: boolean;
  kycStatus?: string;
  birthDate?: string | null;
  acceptedTerms?: boolean;
  sellerVerifiedAt?: Date | null;
}

const demoUsers: DemoUser[] = [
  {
    email: 'demo@revia.test',
    fullName: 'Usuario Demo',
    kycStatus: 'not_started',
  },
  {
    email: 'pendiente@revia.test',
    fullName: 'Usuario Pendiente',
    onboardingCompleted: false,
    birthDate: null,
    acceptedTerms: false,
    kycStatus: 'not_started',
  },
  {
    email: 'vendedor@revia.test',
    fullName: 'Vendedor Demo',
    kycStatus: 'approved',
    sellerVerifiedAt: new Date(),
  },
  {
    email: 'admin@revia.test',
    fullName: 'Admin Demo',
    role: 'admin',
    kycStatus: 'approved',
  },
];

async function upsertDemoUser(input: DemoUser): Promise<void> {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);
  const existing = await User.findOne({ where: { email: input.email } });

  const values = {
    passwordHash,
    fullName: input.fullName,
    birthDate: input.birthDate === undefined ? '1990-01-01' : input.birthDate,
    role: input.role ?? 'user',
    emailVerified: true,
    emailVerifiedAt: new Date(),
    isSuspended: false,
    acceptedTermsAt: input.acceptedTerms === false ? null : new Date(),
    onboardingCompleted: input.onboardingCompleted ?? true,
    kycStatus: input.kycStatus ?? 'not_started',
    sellerVerifiedAt: input.sellerVerifiedAt ?? null,
    isDeleted: false,
  };

  if (existing) {
    await existing.update(values);
    return;
  }

  await User.create({ email: input.email, ...values });
}

interface DemoListing {
  title: string;
  description: string;
  categorySlug: string;
  condition: string;
  priceArs: number;
  deliveryModes: string[];
  location: string;
  attributes: Record<string, string | number | boolean>;
  photoUrls: string[];
}

const demoListings: DemoListing[] = [
  {
    title: 'Campera de abrigo azul',
    description:
      'Campera de abrigo azul, talle M, en muy buen estado. Ideal para el invierno de Bahía Blanca.',
    categorySlug: 'moda-mujer',
    condition: 'very_good',
    priceArs: 18_000,
    deliveryModes: ['pickup_home', 'midpoint'],
    location: 'Bahía Blanca',
    attributes: {
      size: 'M',
      brand: 'Demo',
      color: 'Azul',
      gender: 'Mujer',
    },
    photoUrls: ['/1.jpeg', '/2.jpeg', '/3.jpg'],
  },
  {
    title: 'Celular Android libre',
    description:
      'Celular Android libre de fábrica, con cargador original y funda. Funciona perfecto.',
    categorySlug: 'electronica-celulares',
    condition: 'good',
    priceArs: 120_000,
    deliveryModes: ['pickup_home'],
    location: 'Bahía Blanca',
    attributes: {
      brand: 'Samsung',
      model: 'Galaxy A54',
      warranty: false,
      accessories: 'Cargador original y funda',
    },
    photoUrls: ['/2.jpeg', '/3.jpg'],
  },
  {
    title: 'Bicicleta rodado 29',
    description:
      'Bicicleta rodado 29, mountain bike, en muy buen estado. Recién service y lista para andar.',
    categorySlug: 'deportes-bicicletas',
    condition: 'very_good',
    priceArs: 250_000,
    deliveryModes: ['midpoint'],
    location: 'Bahía Blanca',
    attributes: {
      type: 'Mountain bike',
      size: 'M',
      brand: 'Demo',
    },
    photoUrls: ['/3.jpg'],
  },
];

async function seedDemoListings(sellerId: string): Promise<void> {
  for (const demo of demoListings) {
    const category = await Category.findOne({ where: { slug: demo.categorySlug } });

    if (!category) {
      logger.warn('No se encontró la categoría para la publicación demo', {
        slug: demo.categorySlug,
      });
      continue;
    }

    const existing = await Listing.findOne({
      where: { sellerId, title: demo.title },
    });

    if (existing) {
      continue;
    }

    const listing = await Listing.create({
      sellerId,
      categoryId: category.id,
      title: demo.title,
      description: demo.description,
      condition: demo.condition,
      priceArs: demo.priceArs,
      deliveryModes: demo.deliveryModes,
      midpointFeeArs: demo.deliveryModes.includes('midpoint') ? DEFAULTS.midpointFeeArs : 0,
      allowOffers: true,
      location: demo.location,
      attributes: demo.attributes,
      status: 'active',
      publishedAt: new Date(),
    });

    for (const [index, url] of demo.photoUrls.entries()) {
      await ListingPhoto.create({
        listingId: listing.id,
        url,
        thumbnailUrl: url,
        sortOrder: index,
      });
    }
  }
}

async function run(): Promise<void> {
  if (envs.NODE_ENV === 'production') {
    logger.error('El seed de desarrollo no se ejecuta en producción');
    process.exit(1);
  }

  await sequelize.authenticate();
  await seedCategories();

  for (const user of demoUsers) {
    await upsertDemoUser(user);
  }

  const seller = await User.findOne({ where: { email: 'vendedor@revia.test' } });

  if (seller) {
    await seedDemoListings(seller.id);
  }

  logger.info('Seed de desarrollo listo', {
    password: DEMO_PASSWORD,
    users: demoUsers.map((user) => user.email),
    hint: 'Corré npm run migrate antes si es la primera vez.',
  });

  await sequelize.close();
}

void run().catch(async (error: unknown) => {
  logger.error('Falló el seed de desarrollo', {
    error: error instanceof Error ? error.message : String(error),
  });
  await sequelize.close().catch(() => undefined);
  process.exit(1);
});
