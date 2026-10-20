import { DataSource, IsNull } from 'typeorm';
import { Product } from '../entities/Product';
import { InsufficientStockError, InvalidQuantityError, ProductNotFoundError } from '../errors';
import { isValidQuantity, wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function decreaseStock(
  dataSource: DataSource,
  input: { productId: string; quantity: unknown },
): Promise<Product> {
  if (!isValidQuantity(input.quantity)) {
    throw new InvalidQuantityError(input.quantity);
  }

  const quantity = input.quantity;
  return dataSource.transaction(async (manager) => {
    const repository = manager.getRepository(Product);
    const product = await repository.findOne({
      where: { id: input.productId, deletedAt: IsNull() },
      lock: { mode: 'pessimistic_write' },
    });
    if (!product) {
      throw new ProductNotFoundError(input.productId);
    }

    if (quantity > product.stock) {
      throw new InsufficientStockError();
    }

    product.stock -= quantity;
    return repository.save(product);
  });
}

export function decreaseStockRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const product = await decreaseStock(dataSource, {
      productId: req.params.productId,
      quantity: req.body.quantity,
    });
    res.status(200).json(presentProduct(product));
  });
}
