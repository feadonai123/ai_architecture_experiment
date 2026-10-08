import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { OrderRecord } from '../../../shared/database/OrderRecord';
import { Order } from '../../../shared/entities/Order';

export class OrderRepository {
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
}
