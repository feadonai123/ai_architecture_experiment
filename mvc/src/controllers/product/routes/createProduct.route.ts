import { NextFunction, Request, Response } from 'express';
import { InvalidNameError } from '../../../errors/InvalidNameError';
import { InvalidPriceError } from '../../../errors/InvalidPriceError';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

function isValidName(name: unknown): name is string {
  return typeof name === 'string' && name.trim().length > 0;
}

function isValidPrice(price: unknown): price is number {
  return typeof price === 'number' && Number.isFinite(price) && price >= 0;
}

export async function createProduct(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { name, description, price } = req.body ?? {};
    if (!isValidName(name)) {
      throw new InvalidNameError(name);
    }
    if (!isValidPrice(price)) {
      throw new InvalidPriceError(price);
    }

    const product = await Product.create({
      name: name.trim(),
      description: typeof description === 'string' ? description : '',
      price,
    });
    res.status(201).json(presentProduct(product));
  } catch (error) {
    next(error);
  }
}
