import { OrderPaymentStatus } from './OrderPaymentStatus';

export class OrderPayment {
  constructor(
    public readonly orderId: string,
    public readonly status: OrderPaymentStatus,
    public readonly paymentDetails: Record<string, unknown> | null,
    public readonly paidAt: Date | null,
    public readonly createdAt: Date,
  ) {}
}
