import { Order as OrderEntity } from '../../src/entities/Order';
import { Order } from '../../src/models/Order';

export function mockOrderCreateWithItems(value: OrderEntity) {
  return jest.spyOn(Order, 'createWithItems').mockResolvedValue(value);
}
