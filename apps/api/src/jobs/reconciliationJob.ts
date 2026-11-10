import { logger } from '../config/logger.js';
import { reconcileTaloPayments } from '../modules/payouts/payoutRecords.service.js';

let running = false;

export async function runTaloReconciliation(): Promise<void> {
  if (running) {
    return;
  }

  running = true;

  try {
    const result = await reconcileTaloPayments();
    logger.info('Conciliación Talo ejecutada', {
      checked: result.checked,
      updated: result.updated,
      mismatches: result.mismatches.length,
    });
  } catch (error) {
    logger.error('Falló la conciliación Talo', {
      error: error instanceof Error ? error.message : String(error),
    });
  } finally {
    running = false;
  }
}
