import { NextFunction, Request, Response } from 'express';
import { InsufficientStockError } from '../../../errors/InsufficientStockError';
import { InvalidQuantityError } from '../../../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

function isValidQuantity(quantity: unknown): quantity is number {
  return typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0;
}

export async function decreaseStock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { productId } = req.params;
    const { quantity } = req.body ?? {};

    if (!isValidQuantity(quantity)) {
      throw new InvalidQuantityError(quantity);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }
    if (quantity > product.stock) {
      throw new InsufficientStockError();
    }

    product.stock -= quantity;
    const updated = await Product.save(product);
    res.status(200).json(presentProduct(updated));
  } catch (error) {
    next(error);
  }
}
