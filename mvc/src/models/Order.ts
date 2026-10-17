import { DeepPartial, EntityManager } from 'typeorm';
import { getDataSource } from '../database';
import { Order as OrderEntity } from '../entities/Order';

export class Order {
  static findByIdForUpdate(
    id: string,
    manager: EntityManager = getDataSource().manager,
  ): Promise<OrderEntity | null> {
    return manager.getRepository(OrderEntity).findOne({
      where: { id },
      lock: { mode: 'pessimistic_write' },
    });
  }

  static update(
    order: OrderEntity,
    manager: EntityManager = getDataSource().manager,
  ): Promise<OrderEntity> {
    return manager.getRepository(OrderEntity).save(order);
  }

  static create(
    order: DeepPartial<OrderEntity>,
    manager: EntityManager = getDataSource().manager,
  ): Promise<OrderEntity> {
    const repository = manager.getRepository(OrderEntity);
    return repository.save(repository.create(order));
  }
}
