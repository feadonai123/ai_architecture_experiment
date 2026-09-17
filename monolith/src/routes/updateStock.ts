import { DataSource } from 'typeorm';
import { Product } from '../entities/Product';
import { InvalidQuantityError, ProductNotFoundError } from '../errors';
import { wrap } from '../helpers';
import { presentProduct } from '../presenters/product.presenter';

export async function updateStock(
  dataSource: DataSource,
  input: { productId: string; quantity: unknown },
): Promise<Product> {
  if (
    typeof input.quantity !== 'number' ||
    !Number.isInteger(input.quantity) ||
    input.quantity < 0
  ) {
    throw new InvalidQuantityError(input.quantity);
  }

  const repository = dataSource.getRepository(Product);
  const product = await repository.findOne({ where: { id: input.productId } });
  if (!product) {
    throw new ProductNotFoundError(input.productId);
  }

  product.stock = input.quantity;
  return repository.save(product);
}

export function updateStockRoute(dataSource: DataSource) {
  return wrap(async (req, res) => {
    const product = await updateStock(dataSource, {
      productId: req.params.productId,
      quantity: req.body.quantity,
    });
    res.status(200).json(presentProduct(product));
  });
}
