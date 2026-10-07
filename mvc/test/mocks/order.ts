import { Order as OrderEntity } from '../../src/entities/Order';
import { Order } from '../../src/models/Order';

export function mockOrderCreate(value: OrderEntity) {
  return jest.spyOn(Order, 'create').mockResolvedValue(value);
}

export function mockOrderFindByIdForUpdate(value: OrderEntity | null) {
  return jest.spyOn(Order, 'findByIdForUpdate').mockResolvedValue(value);
}

export function mockOrderUpdate(value?: OrderEntity) {
  return jest.spyOn(Order, 'update').mockImplementation(async (order) => value ?? order);
}
