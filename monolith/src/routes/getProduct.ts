import { DataSource, IsNull } from 'typeorm';
import { Product } from '../entities/Product';
import { ProductNotFoundError } from '../errors';
import { wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function getProduct(dataSource: DataSource, productId: string): Promise<Product> {
  const product = await dataSource
    .getRepository(Product)
    .findOne({ where: { id: productId, deletedAt: IsNull() } });
  if (!product) {
    throw new ProductNotFoundError(productId);
  }
  return product;
}

export function getProductRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const product = await getProduct(dataSource, req.params.productId);
    res.status(200).json(presentProduct(product));
  });
}
