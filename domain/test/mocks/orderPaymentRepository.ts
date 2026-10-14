import { OrderPayment } from '../../src/shared/entities/OrderPayment';

export function mockOrderPaymentRepository(payment: OrderPayment | null = null) {
  return {
    findByOrderId: jest.fn().mockResolvedValue(payment),
    create: jest.fn().mockResolvedValue(undefined),
  };
}
