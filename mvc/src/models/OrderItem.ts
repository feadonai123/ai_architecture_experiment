import { DeepPartial, EntityManager } from 'typeorm';
import { getDataSource } from '../database';
import { OrderItem as OrderItemEntity } from '../entities/OrderItem';

export class OrderItem {
  static create(
    items: DeepPartial<OrderItemEntity>[],
    manager: EntityManager = getDataSource().manager,
  ): Promise<OrderItemEntity[]> {
    const repository = manager.getRepository(OrderItemEntity);
    return repository.save(items.map((item) => repository.create(item)));
  }
}
