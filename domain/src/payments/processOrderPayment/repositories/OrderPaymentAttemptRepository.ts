import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { OrderPaymentAttemptRecord } from '../../../shared/database/OrderPaymentAttemptRecord';
import { OrderPaymentAttempt } from '../../../shared/entities/OrderPaymentAttempt';

export class OrderPaymentAttemptRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByOrderIdAndKey(
    orderId: string,
    idempotencyKey: string,
  ): Promise<OrderPaymentAttempt | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(OrderPaymentAttemptRecord)
      .findOne({ where: { orderId, idempotencyKey } });
    return (
      record &&
      new OrderPaymentAttempt(
        record.orderId,
        record.idempotencyKey,
        record.attemptNumber,
        record.paymentToken,
        record.status,
        record.paymentDetails,
        record.paidAt,
        record.createdAt,
      )
    );
  }

  async countByOrderId(orderId: string): Promise<number> {
    return DbManager.getManager(this.dataSource)
      .getRepository(OrderPaymentAttemptRecord)
      .count({ where: { orderId } });
  }

  async create(attempt: OrderPaymentAttempt): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(OrderPaymentAttemptRecord)
      .save({ ...attempt });
  }
}
