import { OrderPayment } from '../../src/entities/OrderPayment';
import { OrderPaymentRepository } from '../../src/ports/OrderPaymentRepository';

export function mockOrderPaymentRepository(
  payment: OrderPayment | null = null,
): jest.Mocked<OrderPaymentRepository> {
  return {
    findByOrderId: jest.fn().mockResolvedValue(payment),
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn().mockResolvedValue(undefined),
  };
}
