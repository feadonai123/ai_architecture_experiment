import { DataSource } from 'typeorm';
import { CartItemRecord } from './CartItemRecord';
import { CartRecord } from './CartRecord';
import { postgresOptions } from './postgresOptions';
import { ProductRecord } from './ProductRecord';
import { OrderItemRecord } from './OrderItemRecord';
import { OrderRecord } from './OrderRecord';
import { UserRecord } from './UserRecord';

export function createDataSource(): DataSource {
  return new DataSource({
    ...postgresOptions(),
    entities: [CartRecord, CartItemRecord, ProductRecord, UserRecord, OrderRecord, OrderItemRecord],
  });
}
