import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { OrderItemRecord } from '../../../shared/database/OrderItemRecord';
import { OrderRecord } from '../../../shared/database/OrderRecord';
import { Order } from '../../../shared/entities/Order';
import { OrderItem } from '../../../shared/entities/OrderItem';

export class OrderRepository {
  constructor(private readonly dataSource: DataSource) {}

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
