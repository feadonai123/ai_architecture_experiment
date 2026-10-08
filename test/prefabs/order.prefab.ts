import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderRecord } from '../persistence/order.record';

type OrderOverrides = Partial<
  Pick<OrderRecord, 'id' | 'userId' | 'status' | 'total' | 'createdAt'>
>;

export class OrderPrefab {
  static async create(dataSource: DataSource, overrides: OrderOverrides): Promise<OrderRecord> {
    const repository = dataSource.getRepository(OrderRecord);
    return repository.save(
      repository.create({
        id: overrides.id ?? uuidv4(),
        userId: overrides.userId,
        status: overrides.status ?? 0,
        total: overrides.total ?? 100,
        createdAt: overrides.createdAt ?? new Date(),
      }),
    );
  }
}
