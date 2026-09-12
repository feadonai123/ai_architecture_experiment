import { DataSource } from 'typeorm';
import { CartItemRecord } from './CartItemRecord';
import { CartRecord } from './CartRecord';
import { postgresOptions } from './postgresOptions';
import { ProductRecord } from './ProductRecord';

export function createDataSource(): DataSource {
  return new DataSource({
    ...postgresOptions(),
    entities: [CartRecord, CartItemRecord, ProductRecord],
  });
}
