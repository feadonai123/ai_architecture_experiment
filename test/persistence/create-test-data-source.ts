import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { requireEnv } from '../helpers/env';
import { CartItemRecord } from './cart-item.record';
import { CartRecord } from './cart.record';
import { OrderItemRecord } from './order-item.record';
import { OrderPaymentRecord } from './order-payment.record';
import { OrderRecord } from './order.record';
import { ProductRecord } from './product.record';
import { UserRecord } from './user.record';

export function createTestDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: requireEnv('POSTGRES_HOST'),
    port: Number(requireEnv('POSTGRES_PORT')),
    username: requireEnv('POSTGRES_USER'),
    password: requireEnv('POSTGRES_PASSWORD'),
    database: requireEnv('POSTGRES_DB'),
    entities: [
      ProductRecord,
      CartRecord,
      CartItemRecord,
      UserRecord,
      OrderRecord,
      OrderItemRecord,
      OrderPaymentRecord,
    ],
    synchronize: false,
    logging: false,
  });
}
