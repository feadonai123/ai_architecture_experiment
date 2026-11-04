import { DeepPartial, EntityManager } from 'typeorm';
import { getDataSource } from '../database';
import { OrderPaymentAttempt as OrderPaymentAttemptEntity } from '../entities/OrderPaymentAttempt';

export class OrderPaymentAttempt {
  static findByOrderAndKey(
    orderId: string,
    idempotencyKey: string,
    manager: EntityManager = getDataSource().manager,
  ): Promise<OrderPaymentAttemptEntity | null> {
    return manager
      .getRepository(OrderPaymentAttemptEntity)
      .findOne({ where: { orderId, idempotencyKey } });
  }

  static create(
    attempt: DeepPartial<OrderPaymentAttemptEntity>,
    manager: EntityManager = getDataSource().manager,
  ): Promise<OrderPaymentAttemptEntity> {
    const repository = manager.getRepository(OrderPaymentAttemptEntity);
    return repository.save(repository.create(attempt));
  }
}
