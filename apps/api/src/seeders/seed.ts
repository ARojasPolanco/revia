import bcrypt from 'bcryptjs';
import { envs } from '../config/envs.js';
import { logger } from '../config/logger.js';
import { sequelize } from '../config/database.js';
import { User } from '../modules/users/user.model.js';

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

async function run(): Promise<void> {
  if (envs.NODE_ENV === 'production') {
    logger.error('El seed de desarrollo no se ejecuta en producción');
    process.exit(1);
  }

  await sequelize.authenticate();

  for (const user of demoUsers) {
    await upsertDemoUser(user);
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
