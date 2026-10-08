import { Order } from '../../src/entities/Order';
import { OrderRepository } from '../../src/ports/OrderRepository';

export function mockOrderRepository(
  order: Order | null = null,
): jest.Mocked<OrderRepository> {
  return {
    create: jest.fn().mockResolvedValue(undefined),
    findByIdForUpdate: jest.fn().mockResolvedValue(order),
    update: jest.fn().mockResolvedValue(undefined),
  };
}
