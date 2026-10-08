import { DataSource } from 'typeorm';
import { Order } from '../entities/Order';
import { OrderItem } from '../entities/OrderItem';
import { OrderRecord } from '../infrastructure/typeorm/OrderRecord';
import { OrderItemRecord } from '../infrastructure/typeorm/OrderItemRecord';
import { DbManager } from '../manager/db.manager';
import { OrderRepository } from '../ports/OrderRepository';

export class TypeOrmOrderRepository implements OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(order: Order): Promise<void> {
    await DbManager.getManager(this.dataSource).getRepository(OrderRecord).save({
      id: order.id,
      userId: order.userId,
      status: order.status,
      total: order.total,
      createdAt: order.createdAt,
    });
  }

  async findByIdForUpdate(id: string): Promise<Order | null> {
    const manager = DbManager.getManager(this.dataSource);
    const record = await manager
      .getRepository(OrderRecord)
      .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!record) return null;
    const items = await manager.getRepository(OrderItemRecord).find({ where: { orderId: id } });
    return new Order(
      record.id,
      record.userId,
      record.status,
      record.total,
      record.createdAt,
      items.map(
        (item) =>
          new OrderItem(item.id, item.orderId, item.productId, item.quantity, item.unitPrice),
      ),
    );
  }

  async update(order: Order): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(OrderRecord)
      .update(order.id, { status: order.status });
  }
}
