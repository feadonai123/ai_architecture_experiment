import { OrderItemRepository } from '../../src/ports/OrderItemRepository';

export function mockOrderItemRepository(): jest.Mocked<OrderItemRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
  };
}
