import { OrderPaymentStatus } from './OrderPaymentStatus';
import { PaymentToken } from './PaymentToken';

export class OrderPaymentAttempt {
  constructor(
    public readonly orderId: string,
    public readonly idempotencyKey: string,
    public readonly attemptNumber: number,
    public readonly paymentToken: PaymentToken,
    public readonly status: OrderPaymentStatus,
    public readonly paymentDetails: Record<string, unknown> | null,
    public readonly paidAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}
