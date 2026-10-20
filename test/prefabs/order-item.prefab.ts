import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { OrderItemRecord } from '../persistence/order-item.record';

export class OrderItemPrefab {
  static async create(
    dataSource: DataSource,
    input: Pick<OrderItemRecord, 'orderId' | 'productId' | 'quantity' | 'unitPrice'>,
  ): Promise<OrderItemRecord> {
    const repository = dataSource.getRepository(OrderItemRecord);
    return repository.save(repository.create({ id: uuidv4(), ...input }));
  }
}
