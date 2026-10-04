import { NextFunction, Request, Response } from 'express';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

export async function listStocks(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const products = await Product.findAll();
    res.status(200).json(products.map(presentProduct));
  } catch (error) {
    next(error);
  }
}
