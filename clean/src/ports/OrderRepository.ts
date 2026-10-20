import { Order } from '../entities/Order';

export interface OrderRepository {
  findById(id: string): Promise<Order | null>;
  create(order: Order): Promise<void>;
  findByIdForUpdate(id: string): Promise<Order | null>;
  update(order: Order): Promise<void>;
}
