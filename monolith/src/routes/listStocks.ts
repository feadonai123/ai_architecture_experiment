import { DataSource } from 'typeorm';
import { Product } from '../entities/Product';
import { wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function listStocks(dataSource: DataSource): Promise<Product[]> {
  return dataSource.getRepository(Product).find({ order: { id: 'ASC' } });
}

export function listStocksRoute(dataSource: DataSource) {
  return wrap(async (_req, res) => {
    const products = await listStocks(dataSource);
    res.status(200).json(products.map(presentProduct));
  });
}
