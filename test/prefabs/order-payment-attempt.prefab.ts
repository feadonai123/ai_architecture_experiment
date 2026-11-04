import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderPaymentAttemptRecord } from '../persistence/order-payment-attempt.record';

export class OrderPaymentAttemptPrefab {
  static async create(
    dataSource: DataSource,
    overrides: Partial<OrderPaymentAttemptRecord> & {
      orderId: string;
      attemptNumber: number;
      idempotencyKey: string;
    },
  ): Promise<OrderPaymentAttemptRecord> {
    const repo = dataSource.getRepository(OrderPaymentAttemptRecord);
    return repo.save(
      repo.create({
        id: uuidv4(),
        paymentToken: 'sim-declined',
        status: 2,
        paymentDetails: { provider: 'simulated', transactionId: uuidv4(), amount: 250 },
        paidAt: null,
        createdAt: new Date(),
        ...overrides,
      }),
    );
  }
}
