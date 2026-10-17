import fs from 'node:fs';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { requireEnv } from '../utils/env';
import { CartItemRecord } from './typeorm/CartItemRecord';
import { CartRecord } from './typeorm/CartRecord';
import { ProductRecord } from './typeorm/ProductRecord';
import { UserRecord } from './typeorm/UserRecord';
import { OrderRecord } from './typeorm/OrderRecord';
import { OrderItemRecord } from './typeorm/OrderItemRecord';
import { OrderPaymentRecord } from './typeorm/OrderPaymentRecord';

export function createDataSource(): DataSource {
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

export async function applySchema(dataSource: DataSource): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../../../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await dataSource.query(sql);
}
