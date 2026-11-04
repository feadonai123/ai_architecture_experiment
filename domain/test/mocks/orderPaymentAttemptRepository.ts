import { OrderPaymentAttempt } from '../../src/shared/entities/OrderPaymentAttempt';

export function mockOrderPaymentAttemptRepository(
  options: { existing?: OrderPaymentAttempt | null; count?: number } = {},
) {
  return {
    findByOrderIdAndKey: jest.fn().mockResolvedValue(options.existing ?? null),
    countByOrderId: jest.fn().mockResolvedValue(options.count ?? 0),
    create: jest.fn().mockResolvedValue(undefined),
  };
}
