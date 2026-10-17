import { DeepPartial, EntityManager } from 'typeorm';
import { getDataSource } from '../database';
import { OrderPayment as OrderPaymentEntity } from '../entities/OrderPayment';

export class OrderPayment {
  static findByOrderId(
    orderId: string,
    manager: EntityManager = getDataSource().manager,
  ): Promise<OrderPaymentEntity | null> {
    return manager.getRepository(OrderPaymentEntity).findOne({ where: { orderId } });
  }

  static create(
    payment: DeepPartial<OrderPaymentEntity>,
    manager: EntityManager = getDataSource().manager,
  ): Promise<OrderPaymentEntity> {
    const repository = manager.getRepository(OrderPaymentEntity);
    return repository.save(repository.create(payment));
  }
}
