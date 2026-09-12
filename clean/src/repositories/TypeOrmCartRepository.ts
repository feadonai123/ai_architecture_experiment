import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Cart } from '../entities/Cart';
import { CartItem } from '../entities/CartItem';
import { CartRepository } from '../ports/CartRepository';
import { CartItemRecord } from '../infrastructure/typeorm/CartItemRecord';
import { CartRecord } from '../infrastructure/typeorm/CartRecord';

export class TypeOrmCartRepository implements CartRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(): Promise<Cart> {
    const repository = this.dataSource.getRepository(CartRecord);
    const saved = await repository.save(
      repository.create({
        id: uuidv4(),
        createdAt: new Date(),
      }),
    );
    return new Cart(saved.id, saved.createdAt, []);
  }

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
