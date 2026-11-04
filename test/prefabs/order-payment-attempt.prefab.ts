import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderPaymentAttemptRecord } from '../persistence/order-payment-attempt.record';

type OrderPaymentAttemptOverrides = Partial<
  Pick<
    OrderPaymentAttemptRecord,
    | 'attemptNumber'
    | 'idempotencyKey'
    | 'paymentToken'
    | 'status'
    | 'paymentDetails'
    | 'paidAt'
    | 'createdAt'
  >
> & { orderId: string };

export class OrderPaymentAttemptPrefab {
  static async create(
    dataSource: DataSource,
    overrides: OrderPaymentAttemptOverrides,
  ): Promise<OrderPaymentAttemptRecord> {
    const repository = dataSource.getRepository(OrderPaymentAttemptRecord);
    return repository.save(
      repository.create({
        orderId: overrides.orderId,
        attemptNumber: overrides.attemptNumber ?? 1,
        idempotencyKey: overrides.idempotencyKey ?? uuidv4(),
        paymentToken: overrides.paymentToken ?? 'sim-declined',
        status: overrides.status ?? 2,
        paymentDetails: overrides.paymentDetails ?? null,
        paidAt: overrides.paidAt ?? null,
        createdAt: overrides.createdAt ?? new Date(),
      }),
    );
  }
}
