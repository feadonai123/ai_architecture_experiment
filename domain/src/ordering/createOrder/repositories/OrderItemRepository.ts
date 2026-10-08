import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { OrderItemRecord } from '../../../shared/database/OrderItemRecord';
import { OrderItem } from '../../../shared/entities/OrderItem';

export class OrderItemRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(items: OrderItem[]): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(OrderItemRecord)
      .save(items.map((item) => ({ ...item })));
  }
}
