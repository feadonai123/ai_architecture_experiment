import { Order } from '../entities/Order';
import { presentOrderItem } from './orderItem.presenter';

export function presentOrder(order: Order) {
  return {
    id: order.id,
    userId: order.userId,
    status: order.status,
    total: order.total,
    createdAt: new Date(order.createdAt).toISOString(),
    items: (order.items ?? []).map(presentOrderItem),
  };
}
