import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Product } from '../entities/Product';
import {
  DuplicateSlugError,
  InvalidNameError,
  InvalidPriceError,
  InvalidSlugError,
} from '../errors';
import { isValidName, isValidPrice, isValidSlug, wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function createProduct(
  dataSource: DataSource,
  input: { name: unknown; slug: unknown; description?: unknown; price: unknown },
): Promise<Product> {
  if (!isValidName(input.name)) {
    throw new InvalidNameError(input.name);
  }
  if (!isValidSlug(input.slug)) {
    throw new InvalidSlugError(input.slug);
  }
  if (!isValidPrice(input.price)) {
    throw new InvalidPriceError(input.price);
  }
  const description = typeof input.description === 'string' ? input.description : '';
  const slug = input.slug.trim();

  const repository = dataSource.getRepository(Product);
  const existing = await repository.findOne({ where: { slug } });
  if (existing) {
    throw new DuplicateSlugError(slug);
  }

  const product = repository.create({
    id: uuidv4(),
    name: input.name.trim(),
    slug,
    description,
    price: input.price,
    stock: 0,
    deletedAt: null,
  });
  return repository.save(product);
}

export function createProductRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const product = await createProduct(dataSource, {
      name: req.body?.name,
      slug: req.body?.slug,
      description: req.body?.description,
      price: req.body?.price,
    });
    res.status(201).json(presentProduct(product));
  });
}
