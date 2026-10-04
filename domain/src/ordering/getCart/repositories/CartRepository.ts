import { DataSource, In, IsNull } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { CartItemRecord } from '../../../shared/database/CartItemRecord';
import { CartRecord } from '../../../shared/database/CartRecord';
import { ProductRecord } from '../../../shared/database/ProductRecord';
import { Cart } from '../../../shared/entities/Cart';
import { CartItem } from '../../../shared/entities/CartItem';

export class CartRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findWithItems(id: string): Promise<Cart | null> {
    const manager = DbManager.getManager(this.dataSource);
    const record = await manager.getRepository(CartRecord).findOne({ where: { id } });
    if (!record) {
      return null;
    }
    const items = await manager.getRepository(CartItemRecord).find({ where: { cartId: id } });
    const visible = await this.visibleItems(manager, items);
    return new Cart(
      record.id,
      record.createdAt,
      visible.map((item) => new CartItem(item.id, item.cartId, item.productId, item.quantity)),
    );
  }

  private async visibleItems(
    manager: ReturnType<typeof DbManager.getManager>,
    items: CartItemRecord[],
  ): Promise<CartItemRecord[]> {
    if (items.length === 0) {
      return [];
    }
    const active = await manager.getRepository(ProductRecord).find({
      where: { id: In(items.map((item) => item.productId)), deletedAt: IsNull() },
    });
    const activeIds = new Set(active.map((product) => product.id));
    return items.filter((item) => activeIds.has(item.productId));
  }
}
