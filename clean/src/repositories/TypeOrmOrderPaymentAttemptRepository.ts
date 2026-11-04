import { DataSource } from 'typeorm';
import { OrderPaymentAttempt } from '../entities/OrderPaymentAttempt';
import { OrderPaymentAttemptRecord } from '../infrastructure/typeorm/OrderPaymentAttemptRecord';
import { DbManager } from '../manager/db.manager';
import { OrderPaymentAttemptRepository } from '../ports/OrderPaymentAttemptRepository';

function toEntity(record: OrderPaymentAttemptRecord): OrderPaymentAttempt {
  return new OrderPaymentAttempt(
    record.orderId,
    record.attemptNumber,
    record.idempotencyKey,
    record.paymentToken,
    record.status,
    record.paymentDetails,
    record.paidAt,
    record.createdAt,
  );
}

export class TypeOrmOrderPaymentAttemptRepository implements OrderPaymentAttemptRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByOrderId(orderId: string): Promise<OrderPaymentAttempt[]> {
    const records = await DbManager.getManager(this.dataSource)
      .getRepository(OrderPaymentAttemptRecord)
      .find({ where: { orderId }, order: { attemptNumber: 'ASC' } });
    return records.map(toEntity);
  }

  async create(attempt: OrderPaymentAttempt): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(OrderPaymentAttemptRecord)
      .save({ ...attempt });
  }
}
