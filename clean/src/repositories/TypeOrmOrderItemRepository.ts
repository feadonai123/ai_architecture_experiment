import { DataSource } from 'typeorm';
import { OrderItem } from '../entities/OrderItem';
import { OrderItemRecord } from '../infrastructure/typeorm/OrderItemRecord';
import { DbManager } from '../manager/db.manager';
import { OrderItemRepository } from '../ports/OrderItemRepository';

export class TypeOrmOrderItemRepository implements OrderItemRepository {
  constructor(private readonly dataSource: DataSource) {}
  async create(items: OrderItem[]): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(OrderItemRecord)
      .save(items.map((item) => ({ ...item })));
  }
}
