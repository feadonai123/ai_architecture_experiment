import { Cart } from '../entities/Cart';

export interface CartRepository {
  create(): Promise<Cart>;
  findById(id: string): Promise<Cart | null>;
  findWithItems(id: string): Promise<Cart | null>;
}
