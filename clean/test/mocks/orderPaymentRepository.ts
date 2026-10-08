import { OrderPaymentRepository } from '../../src/ports/OrderPaymentRepository';

export function mockOrderPaymentRepository(): jest.Mocked<OrderPaymentRepository> {
  return {
    findByOrderId: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(undefined),
  };
}
