import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { OrderPaymentRecord } from '../../../shared/database/OrderPaymentRecord';
import { OrderPayment } from '../../../shared/entities/OrderPayment';

export class OrderPaymentRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findByOrderId(orderId: string): Promise<OrderPayment | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(OrderPaymentRecord)
      .findOne({ where: { orderId } });
    return (
      record &&
      new OrderPayment(
        record.orderId,
        record.status,
        record.paymentDetails,
        record.paidAt,
        record.createdAt,
      )
    );
  }

  async create(payment: OrderPayment): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(OrderPaymentRecord)
      .save({ ...payment });
  }
}
