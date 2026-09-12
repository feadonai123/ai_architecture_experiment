import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Cart } from '../../../shared/entities/Cart';
import { CartRecord } from '../../../shared/database/CartRecord';

export class CartRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(): Promise<Cart> {
    const repository = this.dataSource.getRepository(CartRecord);
    const saved = await repository.save(
      repository.create({
        id: uuidv4(),
        createdAt: new Date(),
      }),
    );
    return new Cart(saved.id, saved.createdAt, []);
  }
}
