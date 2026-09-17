import { DataSource } from 'typeorm';
import { Product } from '../entities/Product';
import { ProductNotFoundError } from '../errors';
import { wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function getStock(dataSource: DataSource, productId: string): Promise<Product> {
  const product = await dataSource.getRepository(Product).findOne({ where: { id: productId } });
  if (!product) {
    throw new ProductNotFoundError(productId);
  }
  return product;
}

export function getStockRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const product = await getStock(dataSource, req.params.productId);
    res.status(200).json(presentProduct(product));
  });
}
