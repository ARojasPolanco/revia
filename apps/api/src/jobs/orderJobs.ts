import { logger } from '../config/logger.js';
import { expireCoupons } from '../modules/coupons/coupons.service.js';
import { expireOffers } from '../modules/offers/offers.service.js';
import { completeDeliveredOrders } from '../modules/orders/orders.service.js';
import { expirePendingPayments } from '../modules/payments/payments.service.js';

let running = false;

export async function runOrderJobs(): Promise<void> {
  if (running) {
    return;
  }

  running = true;

  try {
    await expireOffers();
    await expireCoupons();
    await expirePendingPayments();
    const completed = await completeDeliveredOrders();

    if (completed > 0) {
      logger.info('Órdenes completadas automáticamente', { completed });
    }
  } catch (error) {
    logger.error('Fallaron los jobs de órdenes', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    running = false;
  }
}
