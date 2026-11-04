import { OrderPaymentStatus } from '../enums/OrderPaymentStatus';

export type OrderPaymentView = {
  orderId: string;
  status: OrderPaymentStatus;
  paymentDetails: Record<string, unknown> | null;
  paidAt: Date | null;
  createdAt: Date;
};

export function presentOrderPayment(payment: OrderPaymentView) {
  return {
    orderId: payment.orderId,
    status: payment.status,
    paymentDetails: payment.paymentDetails,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}
