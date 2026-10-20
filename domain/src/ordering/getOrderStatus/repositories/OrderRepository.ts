import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { Order } from '../../../shared/entities/Order';
import { OrderRecord } from '../../../shared/database/OrderRecord';

export class OrderRepository {
  constructor(private readonly dataSource: DataSource) {}
  async findById(id: string): Promise<Order | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(OrderRecord)
      .findOne({ where: { id } });
    return record
      ? new Order(record.id, record.userId, record.status, record.total, record.createdAt, [])
      : null;
  }
}
