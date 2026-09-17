import { DataSource } from 'typeorm';
import { Product } from '../entities/Product';
import { InvalidQuantityError, ProductNotFoundError } from '../errors';
import { isValidQuantity, wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function increaseStock(
  dataSource: DataSource,
  input: { productId: string; quantity: unknown },
): Promise<Product> {
  if (!isValidQuantity(input.quantity)) {
    throw new InvalidQuantityError(input.quantity);
  }

  const repository = dataSource.getRepository(Product);
  const product = await repository.findOne({ where: { id: input.productId } });
  if (!product) {
    throw new ProductNotFoundError(input.productId);
  }

  product.stock += input.quantity;
  return repository.save(product);
}

export function increaseStockRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const product = await increaseStock(dataSource, {
      productId: req.params.productId,
      quantity: req.body.quantity,
    });
    res.status(200).json(presentProduct(product));
  });
}
