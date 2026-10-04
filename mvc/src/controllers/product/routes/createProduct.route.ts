import { NextFunction, Request, Response } from 'express';
import { DuplicateSlugError } from '../../../errors/DuplicateSlugError';
import { InvalidNameError } from '../../../errors/InvalidNameError';
import { InvalidPriceError } from '../../../errors/InvalidPriceError';
import { InvalidSlugError } from '../../../errors/InvalidSlugError';
import { Product } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

function isValidName(name: unknown): name is string {
  return typeof name === 'string' && name.trim().length > 0;
}

function isValidSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && slug.trim().length > 0;
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
    const { name, slug, description, price } = req.body ?? {};
    if (!isValidName(name)) {
      throw new InvalidNameError(name);
    }
    if (!isValidSlug(slug)) {
      throw new InvalidSlugError(slug);
    }
    if (!isValidPrice(price)) {
      throw new InvalidPriceError(price);
    }

    const trimmedSlug = slug.trim();
    const existing = await Product.findBySlug(trimmedSlug);
    if (existing) {
      throw new DuplicateSlugError(trimmedSlug);
    }

    const product = await Product.create({
      name: name.trim(),
      slug: trimmedSlug,
      description: typeof description === 'string' ? description : '',
      price,
    });
    res.status(201).json(presentProduct(product));
  } catch (error) {
    next(error);
  }
}
