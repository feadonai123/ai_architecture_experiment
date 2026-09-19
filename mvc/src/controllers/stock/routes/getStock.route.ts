import { NextFunction, Request, Response } from 'express';
import { Product as ProductEntity } from '../../../entities/Product';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';

export async function getStock(productId: string): Promise<ProductEntity> {
  const product = await Product.findById(productId);
  if (!product) throw new ProductNotFoundError(productId);
  return product;
}

export async function getStockRoute(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await getStock(req.params.productId);
    res.status(200).json(presentProduct(result));
  } catch (error) {
    next(error);
  }
}
