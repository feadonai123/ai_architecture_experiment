import { OrderItem } from '../entities/OrderItem';

export interface OrderItemRepository {
  create(items: OrderItem[]): Promise<void>;
}
