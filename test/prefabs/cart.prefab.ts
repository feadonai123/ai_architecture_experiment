import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { CartRecord } from '../persistence/cart.record';

type CartOverrides = Partial<Pick<CartRecord, 'id' | 'createdAt'>>;

export class CartPrefab {
  static async create(dataSource: DataSource, overrides: CartOverrides = {}): Promise<CartRecord> {
    const repository = dataSource.getRepository(CartRecord);
    const cart = repository.create({
      id: overrides.id ?? uuidv4(),
      createdAt: overrides.createdAt ?? new Date(),
    });
    return repository.save(cart);
  }
}
