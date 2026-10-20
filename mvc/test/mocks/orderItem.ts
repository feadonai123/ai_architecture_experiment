import { OrderItem as OrderItemEntity } from '../../src/entities/OrderItem';
import { OrderItem } from '../../src/models/OrderItem';

export function mockOrderItemCreate(items: OrderItemEntity[]) {
  return jest.spyOn(OrderItem, 'create').mockResolvedValue(items);
}

export function mockOrderItemFindByOrderId(items: OrderItemEntity[] = []) {
  return jest.spyOn(OrderItem, 'findByOrderId').mockResolvedValue(items);
}
