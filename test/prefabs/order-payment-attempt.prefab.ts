import { DataSource } from 'typeorm';
import { OrderPaymentAttemptRecord } from '../persistence/order-payment-attempt.record';
export class OrderPaymentAttemptPrefab {
  static async create(
    dataSource: DataSource,
    overrides: Partial<OrderPaymentAttemptRecord> & { orderId: string; idempotencyKey: string },
  ): Promise<OrderPaymentAttemptRecord> {
    const repo = dataSource.getRepository(OrderPaymentAttemptRecord);
    return repo.save(
      repo.create({
        attemptNumber: 1,
        token: 'sim-approved',
        status: 1,
        paymentDetails: null,
        paidAt: null,
        createdAt: new Date(),
        ...overrides,
      }),
    );
  }
}
