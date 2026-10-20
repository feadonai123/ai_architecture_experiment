import { DataSource, IsNull } from 'typeorm';
import { Product } from '../entities/Product';
import { ProductNotFoundError } from '../errors';
import { wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function deleteProduct(dataSource: DataSource, productId: string): Promise<Product> {
  return dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(Product);
    const product = await repository.findOne({
      where: { id: productId, deletedAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) {
      throw new ProductNotFoundError(productId);
    }
    product.deletedAt = new Date();
    return repository.save(product);
  });
}

export function deleteProductRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const product = await deleteProduct(dataSource, req.params.productId);
    res.status(200).json(presentProduct(product));
  });
}
