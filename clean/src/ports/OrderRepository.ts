import { Order } from '../entities/Order';

export interface OrderRepository {
  create(order: Order): Promise<void>;
  findByIdForUpdate(id: string): Promise<Order | null>;
  update(order: Order): Promise<void>;
}
