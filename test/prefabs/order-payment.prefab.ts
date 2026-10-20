import { DataSource } from 'typeorm';
import { OrderPaymentRecord } from '../persistence/order-payment.record';
export class OrderPaymentPrefab {
  static async create(
    dataSource: DataSource,
    overrides: Partial<OrderPaymentRecord> & { orderId: string },
  ): Promise<OrderPaymentRecord> {
    const repo = dataSource.getRepository(OrderPaymentRecord);
    return repo.save(
      repo.create({
        status: 0,
        paymentDetails: null,
        paidAt: null,
        createdAt: new Date(),
        ...overrides,
      }),
    );
  }
}
