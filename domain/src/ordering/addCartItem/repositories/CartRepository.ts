import { DataSource } from 'typeorm';
import { Cart } from '../../../shared/entities/Cart';
import { CartItem } from '../../../shared/entities/CartItem';
import { CartItemRecord } from '../../../shared/database/CartItemRecord';
import { CartRecord } from '../../../shared/database/CartRecord';

export class CartRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Cart | null> {
    const record = await this.dataSource.getRepository(CartRecord).findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return new Cart(record.id, record.createdAt, []);
  }

  async findWithItems(id: string): Promise<Cart | null> {
    const record = await this.dataSource.getRepository(CartRecord).findOne({ where: { id } });
    if (!record) {
      return null;
    }
    const items = await this.dataSource
      .getRepository(CartItemRecord)
      .find({ where: { cartId: id } });
    return new Cart(
      record.id,
      record.createdAt,
      items.map((item) => new CartItem(item.id, item.cartId, item.productId, item.quantity)),
    );
  }
}
