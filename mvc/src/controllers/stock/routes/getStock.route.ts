import { NextFunction, Request, Response } from 'express';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

export async function getStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const product = await Product.findById(req.params.productId);
    if (!product) {
      throw new ProductNotFoundError(req.params.productId);
    }
    res.status(200).json(presentProduct(product));
  } catch (error) {
    next(error);
  }
}
