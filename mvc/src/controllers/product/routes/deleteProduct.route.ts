import { getDataSource } from '../../../database';
import { NextFunction, Request, Response } from 'express';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

export async function deleteProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const updated = await getDataSource().transaction(async (manager) => {
      const product = await Product.findByIdForUpdate(req.params.productId, manager);
      if (!product) {
        throw new ProductNotFoundError(req.params.productId);
      }
      return Product.softDelete(product, manager);
    });
    res.status(200).json(presentProduct(updated));
  } catch (error) {
    next(error);
  }
}
