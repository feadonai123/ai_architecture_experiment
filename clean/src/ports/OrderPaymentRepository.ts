import { OrderPayment } from '../entities/OrderPayment';

export interface OrderPaymentRepository {
  findByOrderId(orderId: string): Promise<OrderPayment | null>;
  create(payment: OrderPayment): Promise<void>;
}
