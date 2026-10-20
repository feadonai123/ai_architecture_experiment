import { OrderPayment } from '../entities/OrderPayment';
export function presentOrderPayment(payment: OrderPayment) {
  return {
    orderId: payment.orderId,
    status: payment.status,
    paymentDetails: payment.paymentDetails,
    paidAt: payment.paidAt?.toISOString() ?? null,
    createdAt: payment.createdAt.toISOString(),
  };
}
