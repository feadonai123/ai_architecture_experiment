import { DataSource } from 'typeorm';
import { CartItem } from '../../../shared/entities/CartItem';
import { CartItemRecord } from '../../../shared/database/CartItemRecord';

export class CartItemRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByCartAndProduct(cartId: string, productId: string): Promise<CartItem | null> {
    const record = await this.dataSource.getRepository(CartItemRecord).findOne({
      where: { cartId, productId },
    });
    if (!record) {
      return null;
    }
    return new CartItem(record.id, record.cartId, record.productId, record.quantity);
  }

  async save(item: CartItem): Promise<void> {
    const repository = this.dataSource.getRepository(CartItemRecord);
    await repository.save(
      repository.create({
        id: item.id,
        cartId: item.cartId,
        productId: item.productId,
        quantity: item.quantity,
      }),
    );
  }
}
