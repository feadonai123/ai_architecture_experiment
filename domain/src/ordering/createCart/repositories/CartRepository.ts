import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { DbManager } from '../../../manager/db.manager';
import { CartRecord } from '../../../shared/database/CartRecord';
import { Cart } from '../../../shared/entities/Cart';
import { now } from '../../../utils/time';

export class CartRepository {
  constructor(private readonly dataSource: DataSource) {}

  async create(): Promise<Cart> {
    const repository = DbManager.getManager(this.dataSource).getRepository(CartRecord);
    const saved = await repository.save(
      repository.create({
        id: uuidv4(),
        createdAt: now(),
      }),
    );
    return new Cart(saved.id, saved.createdAt, []);
  }
}
