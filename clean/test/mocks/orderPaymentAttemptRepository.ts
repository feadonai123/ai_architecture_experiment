import { OrderPaymentAttempt } from '../../src/entities/OrderPaymentAttempt';
import { OrderPaymentAttemptRepository } from '../../src/ports/OrderPaymentAttemptRepository';

export function mockOrderPaymentAttemptRepository(
  attempts: OrderPaymentAttempt[] = [],
): jest.Mocked<OrderPaymentAttemptRepository> {
  return {
    findByOrderId: jest.fn().mockResolvedValue(attempts),
    create: jest.fn().mockResolvedValue(undefined),
  };
}
