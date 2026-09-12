import { DataSource } from 'typeorm';
import { CartItem } from '../entities/CartItem';
import { CartItemRepository } from '../ports/CartItemRepository';
import { CartItemRecord } from '../infrastructure/typeorm/CartItemRecord';

export class TypeOrmCartItemRepository implements CartItemRepository {
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

  async remove(item: CartItem): Promise<void> {
    await this.dataSource.getRepository(CartItemRecord).delete({ id: item.id });
  }
}
