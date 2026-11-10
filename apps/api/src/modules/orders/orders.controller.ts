import type { Request, Response } from 'express';
import { uuidSchema } from '@revia/shared';
import { catchAsync } from '../../errors/catchAsync.js';
import { AppError } from '../../errors/appError.js';
import { simulateOrderPayment } from '../payments/payments.service.js';
import * as ordersService from './orders.service.js';

function parseId(value: string | undefined): string {
  const parsed = uuidSchema.safeParse(value);

  if (!parsed.success) {
    throw new AppError('No encontramos esa compra.', 404);
  }

  return parsed.data;
}

export const quoteOrder = catchAsync(async (req: Request, res: Response) => {
  const quote = await ordersService.quoteOrder(
    req.user!.id,
    req.body as ordersService.OrderQuoteInput
  );

  res.status(200).json({
    status: 'success',
    quote,
  });
});

export const createOrder = catchAsync(async (req: Request, res: Response) => {
  const result = await ordersService.createOrder(
    req.user!.id,
    req.body as ordersService.CreateOrderInput
  );

  res.status(201).json({
    status: 'success',
    order: result.order,
    paymentError: result.paymentError,
  });
});

export const listPurchases = catchAsync(async (req: Request, res: Response) => {
  const orders = await ordersService.listPurchases(req.user!.id);

  res.status(200).json({
    status: 'success',
    orders,
  });
});

export const listSales = catchAsync(async (req: Request, res: Response) => {
  const orders = await ordersService.listSales(req.user!.id);

  res.status(200).json({
    status: 'success',
    orders,
  });
});

export const getOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await ordersService.getOrderView(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    order,
  });
});

export const payOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await ordersService.payOrder(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    order,
  });
});

export const validateDeliveryCode = catchAsync(async (req: Request, res: Response) => {
  const order = await ordersService.validateDeliveryCode(
    req.user!.id,
    parseId(req.params.id),
    (req.body as { code: string }).code
  );

  res.status(200).json({
    status: 'success',
    order,
  });
});

export const confirmReceipt = catchAsync(async (req: Request, res: Response) => {
  const order = await ordersService.confirmReceipt(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    order,
  });
});

export const markHandoverPending = catchAsync(async (req: Request, res: Response) => {
  const order = await ordersService.markHandoverPending(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    order,
  });
});

export const cancelOrder = catchAsync(async (req: Request, res: Response) => {
  const order = await ordersService.cancelOrder(req.user!.id, parseId(req.params.id));

  res.status(200).json({
    status: 'success',
    order,
  });
});

export const simulatePayment = catchAsync(async (req: Request, res: Response) => {
  const orderId = parseId(req.params.id);
  const result = await simulateOrderPayment(orderId, req.user!.id);
  const order = await ordersService.getOrderView(req.user!.id, orderId);

  res.status(200).json({
    status: 'success',
    simulated: Boolean(result),
    paymentStatus: result?.status ?? 'PENDING',
    order,
  });
});
