import { DataSource, In, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DbManager } from '../manager/db.manager';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { CartItemRecord } from '../infrastructure/typeorm/CartItemRecord';
import { CartRecord } from '../infrastructure/typeorm/CartRecord';
import { ProductRecord } from '../infrastructure/typeorm/ProductRecord';
import { CartRepository } from '../ports/CartRepository';
import { now } from '../utils/time';

export class TypeOrmCartRepository implements CartRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(): Promise<Cart> {
    const repository = DbManager.getManager(this.dataSource).getRepository(CartRecord);
    const saved = await repository.save(
      repository.create({
        id: uuidv4(),
        createdAt: now(),
      }),
    );
    return new Cart(saved.id, saved.createdAt, []);
  }

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
