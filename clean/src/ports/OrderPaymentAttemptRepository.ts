import { OrderPaymentAttempt } from '../entities/OrderPaymentAttempt';

export interface OrderPaymentAttemptRepository {
  findByOrderId(orderId: string): Promise<OrderPaymentAttempt[]>;
  create(attempt: OrderPaymentAttempt): Promise<void>;
}
