import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { CartItemRecord } from '../../../shared/database/CartItemRecord';
import { CartRecord } from '../../../shared/database/CartRecord';
import { Cart } from '../../../shared/entities/Cart';
import { CartItem } from '../../../shared/entities/CartItem';

export class CartRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Cart | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(CartRecord)
      .findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return new Cart(record.id, record.createdAt, []);
  }

  async findWithItems(id: string): Promise<Cart | null> {
    const manager = DbManager.getManager(this.dataSource);
    const record = await manager.getRepository(CartRecord).findOne({ where: { id } });
    if (!record) {
      return null;
    }
    const items = await manager.getRepository(CartItemRecord).find({ where: { cartId: id } });
    return new Cart(
      record.id,
      record.createdAt,
      items.map((item) => new CartItem(item.id, item.cartId, item.productId, item.quantity)),
    );
  }
}
