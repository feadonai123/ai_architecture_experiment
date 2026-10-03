import { Order as OrderEntity } from '../../src/entities/Order';
import { Order } from '../../src/models/Order';

export function mockOrderCreate(value: OrderEntity) {
  return jest.spyOn(Order, 'create').mockResolvedValue(value);
}
