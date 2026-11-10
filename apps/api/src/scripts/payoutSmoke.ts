import request from 'supertest';
import { app } from '../app.js';
import { sequelize } from '../config/database.js';

const password = 'revia12345';

async function login(email: string) {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/login').send({ email, password });

  if (response.status !== 200) {
    throw new Error(`No se pudo iniciar sesión con ${email}.`);
  }

  return agent;
}

async function main(): Promise<void> {
  const seller = await login('vendedor@revia.test');
  const admin = await login('admin@revia.test');

  const account = await seller.put('/api/v1/me/payout-account').send({
    method: 'alias',
    account: 'revia.demo.cobros',
    holderName: 'Vendedor Demo',
  });

  if (account.status !== 200) {
    throw new Error(
      `No se pudo configurar la cuenta de cobro: ${account.body.message ?? account.status}`
    );
  }

  const payouts = await seller.get('/api/v1/me/payouts');
  const pending = (
    payouts.body.payouts as { id: string; status: string; amountArs: number }[]
  ).find((payout) => payout.status === 'pending');

  if (!pending) {
    throw new Error('No hay payouts pendientes. Ejecutá "npm run smoke:fase5-6" primero.');
  }

  const queue = await admin.get('/api/v1/admin/payouts?status=pending');
  if (queue.status !== 200) {
    throw new Error(`No se pudo abrir la cola de finanzas: ${queue.body.message ?? queue.status}`);
  }

  const processing = await admin.post(`/api/v1/admin/payouts/${pending.id}/processing`);
  if (processing.status !== 200) {
    throw new Error(
      `No se pudo procesar el payout: ${processing.body.message ?? processing.status}`
    );
  }

  const operationId = `SMOKE-${Date.now()}`;
  const paid = await admin
    .post(`/api/v1/admin/payouts/${pending.id}/mark-paid`)
    .send({ operationId });

  if (paid.status !== 200 || paid.body.payout.status !== 'paid') {
    throw new Error(`No se pudo pagar el payout: ${paid.body.message ?? paid.status}`);
  }

  const receipt = await seller.get(`/api/v1/me/payouts/${pending.id}/receipt`);
  if (receipt.status !== 200 || !receipt.text.includes(operationId)) {
    throw new Error('No se pudo descargar el comprobante del payout.');
  }

  const summary = await seller.get('/api/v1/me/payouts/summary');

  console.log(`Payout pagado: ${pending.id}`);
  console.log(`Monto: ${pending.amountArs} ARS`);
  console.log(`Operación: ${operationId}`);
  console.log(`Payouts pagados: ${summary.body.summary.paidCount}`);
  console.log('Flujo Fase 7 completo: payout procesado, pagado y comprobante generado.');
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
