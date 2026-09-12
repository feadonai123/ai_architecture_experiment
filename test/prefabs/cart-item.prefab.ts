import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CartItemRecord } from '../persistence/cart-item.record';

type CartItemOverrides = Partial<Pick<CartItemRecord, 'id' | 'quantity'>> & {
  cartId: string;
  productId: string;
};

export class CartItemPrefab {
  static async create(
    dataSource: DataSource,
    overrides: CartItemOverrides,
  ): Promise<CartItemRecord> {
    const repository = dataSource.getRepository(CartItemRecord);
    const item = repository.create({
      id: overrides.id ?? uuidv4(),
      cartId: overrides.cartId,
      productId: overrides.productId,
      quantity: overrides.quantity ?? 1,
    });
    return repository.save(item);
  }
}
