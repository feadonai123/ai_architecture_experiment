import { NextFunction, Request, Response } from 'express';
import { Product as ProductEntity } from '../../../entities/Product';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';
import { InvalidQuantityError } from '../../../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';

export async function updateStock(input: {
  productId: string;
  quantity: unknown;
}): Promise<ProductEntity> {
  if (
    typeof input.quantity !== 'number' ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 0
  ) {
    throw new InvalidQuantityError(input.quantity);
  }
  const product = await Product.findById(input.productId);
  if (!product) throw new ProductNotFoundError(input.productId);
  product.stock = input.quantity;
  return Product.save(product);
}

export async function updateStockRoute(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const result = await updateStock({
      productId: req.params.productId,
      quantity: req.body?.quantity,
    });
    res.status(200).json(presentProduct(result));
  } catch (error) {
    next(error);
  }
}
