import { DataSource, IsNull } from 'typeorm';
import { Product } from '../entities/Product';
import {
  DuplicateSlugError,
  InvalidNameError,
  InvalidPriceError,
  InvalidSlugError,
  ProductNotFoundError,
} from '../errors';
import { isValidName, isValidPrice, isValidSlug, wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function updateProduct(
  dataSource: DataSource,
  input: { productId: string; name: unknown; slug: unknown; description?: unknown; price: unknown },
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

  const repository = dataSource.getRepository(Product);
  const product = await repository.findOne({
    where: { id: input.productId, deletedAt: IsNull() },
  });
  if (!product) {
    throw new ProductNotFoundError(input.productId);
  }

  const slug = input.slug.trim();
  const existing = await repository.findOne({ where: { slug } });
  if (existing && existing.id !== product.id) {
    throw new DuplicateSlugError(slug);
  }

  product.name = input.name.trim();
  product.slug = slug;
  product.description = typeof input.description === 'string' ? input.description : '';
  product.price = input.price;
  return repository.save(product);
}

export function updateProductRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const product = await updateProduct(dataSource, {
      productId: req.params.productId,
      name: req.body?.name,
      slug: req.body?.slug,
      description: req.body?.description,
      price: req.body?.price,
    });
    res.status(200).json(presentProduct(product));
  });
}
