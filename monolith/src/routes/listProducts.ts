import { DataSource } from 'typeorm';
import { InvalidFilterError, InvalidPriceError } from '../errors';
import { Product } from '../entities/Product';
import { parseNonNegativeNumber, parseOptionalBoolean, wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export type ProductFilters = {
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
};

export async function listProducts(
  dataSource: DataSource,
  input: { name?: unknown; minPrice?: unknown; maxPrice?: unknown; available?: unknown },
): Promise<Product[]> {
  const filters: ProductFilters = {};

  if (input.name !== undefined && input.name !== '') {
    if (typeof input.name !== 'string') {
      throw new InvalidFilterError(input.name);
    }
    const name = input.name.trim();
    if (name.length > 0) {
      filters.name = name;
    }
  }

  if (input.minPrice !== undefined && input.minPrice !== '') {
    const minPrice = parseNonNegativeNumber(input.minPrice);
    if (minPrice === null) {
      throw new InvalidPriceError(input.minPrice);
    }
    filters.minPrice = minPrice;
  }

  if (input.maxPrice !== undefined && input.maxPrice !== '') {
    const maxPrice = parseNonNegativeNumber(input.maxPrice);
    if (maxPrice === null) {
      throw new InvalidPriceError(input.maxPrice);
    }
    filters.maxPrice = maxPrice;
  }

  if (
    filters.minPrice !== undefined &&
    filters.maxPrice !== undefined &&
    filters.minPrice > filters.maxPrice
  ) {
    throw new InvalidPriceError(`${filters.minPrice}>${filters.maxPrice}`);
  }

  const available = parseOptionalBoolean(input.available);
  if (available === 'invalid') {
    throw new InvalidFilterError(input.available);
  }
  if (available !== undefined) {
    filters.available = available;
  }

  const qb = dataSource
    .getRepository(Product)
    .createQueryBuilder('product')
    .where('product.deleted_at IS NULL')
    .orderBy('product.id', 'ASC');

  if (filters.name) {
    qb.andWhere('LOWER(product.name) LIKE :name', {
      name: `%${filters.name.toLowerCase()}%`,
    });
  }
  if (filters.minPrice !== undefined) {
    qb.andWhere('product.price >= :minPrice', { minPrice: filters.minPrice });
  }
  if (filters.maxPrice !== undefined) {
    qb.andWhere('product.price <= :maxPrice', { maxPrice: filters.maxPrice });
  }
  if (filters.available === true) {
    qb.andWhere('product.stock > 0');
  }
  if (filters.available === false) {
    qb.andWhere('product.stock = 0');
  }

  return qb.getMany();
}

export function listProductsRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const products = await listProducts(dataSource, {
      name: req.query.name,
      minPrice: req.query.minPrice,
      maxPrice: req.query.maxPrice,
      available: req.query.available,
    });
    res.status(200).json(products.map(presentProduct));
  });
}
