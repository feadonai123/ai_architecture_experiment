import { NextFunction, Request, Response } from 'express';
import { InvalidNameError } from '../../../errors/InvalidNameError';
import { InvalidPriceError } from '../../../errors/InvalidPriceError';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

function isValidName(name: unknown): name is string {
  return typeof name === 'string' && name.trim().length > 0;
}

function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0;
}

export async function updateProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { productId } = req.params;
    const { name, description, price } = req.body ?? {};
    if (!isValidName(name)) {
      throw new InvalidNameError(name);
    }
    if (!isValidPrice(price)) {
      throw new InvalidPriceError(price);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    product.name = name.trim();
    product.description = typeof description === 'string' ? description : '';
    product.price = price;
    const updated = await Product.save(product);
    res.status(200).json(presentProduct(updated));
  } catch (error) {
    next(error);
  }
}
