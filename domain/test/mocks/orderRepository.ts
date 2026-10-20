import { Order } from '../../src/shared/entities/Order';

export function mockOrderRepository(order: Order | null = null) {
  return {
    findById: jest.fn().mockResolvedValue(order),
    create: jest.fn().mockResolvedValue(undefined),
    findByIdForUpdate: jest.fn().mockResolvedValue(order),
    update: jest.fn().mockResolvedValue(undefined),
  };
}
