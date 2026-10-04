import { NextFunction, Request, Response } from 'express';
import { InvalidFilterError } from '../../../errors/InvalidFilterError';
import { InvalidPriceError } from '../../../errors/InvalidPriceError';
import { Product, ProductFilters } from '../../../models/Product';
import { presentProduct } from '../../../presenters/product.presenter';

function parseNonNegativeNumber(value: unknown): number | null {
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
  }
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return value;
  }
  return null;
}

function parseOptionalBoolean(value: unknown): boolean | undefined | 'invalid' {
  if (value === undefined || value === '') {
    return undefined;
  }
  if (value === true || value === 'true') {
    return true;
  }
  if (value === false || value === 'false') {
    return false;
  }
  return 'invalid';
}

export async function listProducts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const filters: ProductFilters = {};
    const { name, minPrice, maxPrice, available } = req.query;

    if (name !== undefined && name !== '') {
      if (typeof name !== 'string') {
        throw new InvalidFilterError(name);
      }
      const trimmed = name.trim();
      if (trimmed.length > 0) {
        filters.name = trimmed;
      }
    }

    if (minPrice !== undefined && minPrice !== '') {
      const parsed = parseNonNegativeNumber(minPrice);
      if (parsed === null) {
        throw new InvalidPriceError(minPrice);
      }
      filters.minPrice = parsed;
    }

    if (maxPrice !== undefined && maxPrice !== '') {
      const parsed = parseNonNegativeNumber(maxPrice);
      if (parsed === null) {
        throw new InvalidPriceError(maxPrice);
      }
      filters.maxPrice = parsed;
    }

    if (
      filters.minPrice !== undefined &&
      filters.maxPrice !== undefined &&
      filters.minPrice > filters.maxPrice
    ) {
      throw new InvalidPriceError(`${filters.minPrice}>${filters.maxPrice}`);
    }

    const parsedAvailable = parseOptionalBoolean(available);
    if (parsedAvailable === 'invalid') {
      throw new InvalidFilterError(available);
    }
    if (parsedAvailable !== undefined) {
      filters.available = parsedAvailable;
    }

    const products = await Product.findByFilters(filters);
    res.status(200).json(products.map(presentProduct));
  } catch (error) {
    next(error);
  }
}
