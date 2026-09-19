import { NextFunction, Request, Response } from 'express';
import { Product as ProductEntity } from '../../../entities/Product';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

export async function listStocks(): Promise<ProductEntity[]> {
  return Product.findAll();
}

export async function listStocksRoute(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await listStocks();
    res.status(200).json(result.map(presentProduct));
  } catch (error) {
    next(error);
  }
}
