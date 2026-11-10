import request from 'supertest';
import sharp from 'sharp';
import { app } from '../app.js';
import { envs } from '../config/envs.js';
import { sequelize } from '../config/database.js';
import { getTaloPayment, simulateTaloTransfer } from '../config/talo.js';
import { Payment } from '../modules/payments/payment.model.js';

const password = 'revia12345';
const delay = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

async function image(color: { r: number; g: number; b: number }): Promise<Buffer> {
  return sharp({
    create: { width: 32, height: 32, channels: 3, background: color },
  })
    .png()
    .toBuffer();
}

async function login(email: string) {
  const agent = request.agent(app);
  const response = await agent.post('/api/v1/auth/login').send({ email, password });

  if (response.status !== 200) {
    throw new Error(`No se pudo iniciar sesión con ${email}. Ejecutá "npm run seed:dev" primero.`);
  }

  return agent;
}

async function main(): Promise<void> {
  const seller = await login('vendedor@revia.test');
  const buyer = await login('demo@revia.test');
  const admin = await login('admin@revia.test');

  const categories = await request(app).get('/api/v1/categories');
  const moda = categories.body.categories.find(
    (category: { slug: string }) => category.slug === 'moda'
  );
  const category = moda.children.find((child: { slug: string }) => child.slug === 'moda-mujer');

  const listing = await seller.post('/api/v1/listings').send({
    title: `Campera smoke Fase 5-6 ${Date.now()}`,
    description:
      'Publicación temporal para probar el flujo completo de oferta, pago, entrega y confirmación.',
    categoryId: category.id,
    condition: 'very_good',
    priceArs: 15_000,
    deliveryModes: ['pickup_home', 'midpoint'],
    allowOffers: true,
    location: 'Bahía Blanca',
    attributes: { size: 'M', brand: 'Smoke', gender: 'Unisex' },
  });

  if (listing.status !== 201) {
    throw new Error(`No se pudo crear la publicación: ${listing.body.message ?? listing.status}`);
  }

  const listingId = listing.body.listing.id as string;

  const photos = await seller
    .post(`/api/v1/listings/${listingId}/photos`)
    .attach('photos', await image({ r: 20, g: 120, b: 110 }), '1.png')
    .attach('photos', await image({ r: 40, g: 80, b: 160 }), '2.png')
    .attach('photos', await image({ r: 160, g: 80, b: 40 }), '3.png');

  if (photos.status !== 201) {
    throw new Error(`No se pudieron subir las fotos: ${photos.body.message ?? photos.status}`);
  }

  await seller.post(`/api/v1/listings/${listingId}/submit`);
  const approved = await admin.post(`/api/v1/admin/listings/${listingId}/approve`);

  if (approved.status !== 200) {
    throw new Error(
      `No se pudo aprobar la publicación: ${approved.body.message ?? approved.status}`
    );
  }

  const offer = await buyer.post(`/api/v1/listings/${listingId}/offers`).send({
    amountArs: 12_000,
  });

  if (offer.status !== 201) {
    throw new Error(`No se pudo crear la oferta: ${offer.body.message ?? offer.status}`);
  }

  const offerId = offer.body.offer.id as string;
  const accepted = await seller.post(`/api/v1/offers/${offerId}/accept`);

  if (accepted.status !== 200) {
    throw new Error(`No se pudo aceptar la oferta: ${accepted.body.message ?? accepted.status}`);
  }

  const quote = await buyer.post('/api/v1/orders/quote').send({
    listingId,
    offerId,
    deliveryMode: 'pickup_home',
  });

  if (quote.status !== 200) {
    throw new Error(`No se pudo cotizar: ${quote.body.message ?? quote.status}`);
  }

  const created = await buyer.post('/api/v1/orders').send({
    listingId,
    offerId,
    deliveryMode: 'pickup_home',
  });

  if (created.status !== 201) {
    throw new Error(`No se pudo crear la orden: ${created.body.message ?? created.status}`);
  }

  const orderId = created.body.order.id as string;
  const payment = await Payment.findOne({ where: { orderId } });

  if (!payment || !payment.cvu) {
    throw new Error('Talo no devolvió CVU para el pago de la orden.');
  }

  console.log(`Orden creada: ${orderId}`);
  console.log(`Total: ${created.body.order.totalAmountArs} ARS`);
  console.log(`Pago sandbox: ${payment.providerPaymentId}`);

  await simulateTaloTransfer(payment.cvu, payment.amountArs);

  let paymentStatus = 'PENDING';

  for (let attempt = 0; attempt < 20; attempt += 1) {
    await delay(1_000);
    const taloPayment = await getTaloPayment(payment.providerPaymentId);
    paymentStatus = taloPayment.payment_status;
    console.log(`Estado Talo: ${paymentStatus}`);

    if (paymentStatus !== 'PENDING') {
      break;
    }
  }

  if (paymentStatus !== 'SUCCESS') {
    throw new Error(`El pago no llegó a SUCCESS. Estado actual: ${paymentStatus}`);
  }

  const webhookPath = envs.TALO_WEBHOOK_SECRET
    ? `/api/v1/webhooks/talo?token=${encodeURIComponent(envs.TALO_WEBHOOK_SECRET)}`
    : '/api/v1/webhooks/talo';
  const webhook = await request(app).post(webhookPath).send({
    message: 'Pago actualizado',
    externalId: orderId,
    paymentId: payment.providerPaymentId,
  });

  if (webhook.status !== 200) {
    throw new Error(`Webhook falló con estado ${webhook.status}`);
  }

  const buyerOrder = await buyer.get(`/api/v1/me/orders/${orderId}`);
  const deliveryCode = buyerOrder.body.order.deliveryCode as string | null;

  if (buyerOrder.body.order.status !== 'paid' || !deliveryCode) {
    throw new Error(`La orden no quedó pagada con código: ${buyerOrder.body.order.status}`);
  }

  console.log(`Orden pagada. Código de entrega: ${deliveryCode}`);

  const delivered = await seller
    .post(`/api/v1/me/orders/${orderId}/validate-delivery`)
    .send({ code: deliveryCode });

  if (delivered.status !== 200 || delivered.body.order.status !== 'delivered') {
    throw new Error(`No se pudo validar la entrega: ${delivered.body.message ?? delivered.status}`);
  }

  const completed = await buyer.post(`/api/v1/me/orders/${orderId}/confirm-receipt`);

  if (completed.status !== 200 || completed.body.order.status !== 'completed') {
    throw new Error(`No se pudo completar la orden: ${completed.body.message ?? completed.status}`);
  }

  console.log(
    'Flujo Fase 5-6 completo: oferta aceptada, pago sandbox, entrega y orden completada.'
  );
}

main()
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  })
  .finally(async () => {
    await sequelize.close();
  });
