import { envs } from '../config/envs.js';
import {
  createTaloPayment,
  getTaloPayment,
  simulateTaloTransfer,
  taloBaseUrl,
} from '../config/talo.js';

const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function main(): Promise<void> {
  const missing = ['TALO_USER_ID', 'TALO_CLIENT_ID', 'TALO_CLIENT_SECRET'].filter(
    (key) => !process.env[key]
  );

  if (missing.length > 0) {
    console.error(`Faltan variables en apps/api/.env: ${missing.join(', ')}`);
    process.exitCode = 1;
    return;
  }

  console.log(`Talo API: ${taloBaseUrl()}`);

  const amountArs = 100;
  const payment = await createTaloPayment({
    amountArs,
    externalId: `SMOKE-${Date.now()}`,
    motive: 'Smoke test REVIA',
    redirectUrl: `${envs.APP_URL}/compras/smoke`,
  });

  console.log(`Pago creado: ${payment.id} (${payment.payment_status})`);

  const quote = payment.quotes?.[0];

  if (quote) {
    console.log(`CVU: ${quote.address}`);
    console.log(`Alias: ${quote.alias ?? '-'}`);
  }

  if (payment.payment_url) {
    console.log(`URL de pago: ${payment.payment_url}`);
  }

  if (!process.argv.includes('--faucet')) {
    console.log('Para simular la transferencia: npm run talo:smoke -- --faucet');
    return;
  }

  if (!quote) {
    console.error('El pago no devolvió CVU para simular la transferencia.');
    process.exitCode = 1;
    return;
  }

  console.log('Simulando transferencia...');
  await simulateTaloTransfer(quote.address, amountArs);

  for (let attempt = 1; attempt <= 15; attempt += 1) {
    await delay(2_000);
    const updated = await getTaloPayment(payment.id);
    console.log(`Intento ${attempt}: ${updated.payment_status}`);

    if (updated.payment_status !== 'PENDING') {
      return;
    }
  }

  console.error('El pago sigue PENDING después de 30 segundos.');
  process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Error desconocido');
  process.exitCode = 1;
});
