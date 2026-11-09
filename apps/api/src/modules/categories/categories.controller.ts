import type { Request, Response } from 'express';
import { catchAsync } from '../../errors/catchAsync.js';
import { getCategoryTree } from './categories.service.js';

export const listCategories = catchAsync(async (_req: Request, res: Response) => {
  const categories = await getCategoryTree();

  res.status(200).json({
    status: 'success',
    categories,
  });
});
