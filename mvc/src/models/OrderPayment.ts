import { getDataSource } from '../database';
import { OrderPayment as OrderPaymentEntity } from '../entities/OrderPayment';

export class OrderPayment {
  static findByOrderId(orderId: string): Promise<OrderPaymentEntity | null> {
    return getDataSource().getRepository(OrderPaymentEntity).findOne({ where: { orderId } });
  }

  static createPending(orderId: string): Promise<OrderPaymentEntity> {
    const repository = getDataSource().getRepository(OrderPaymentEntity);
    return repository.save(
      repository.create({
        orderId,
        status: 'PENDING',
        paymentDetails: null,
        paidAt: null,
        createdAt: new Date(),
      }),
    );
  }
}
