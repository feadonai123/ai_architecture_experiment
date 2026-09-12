import fs from 'node:fs';
import path from 'node:path';
import { DataSource } from 'typeorm';
import { Cart } from './entities/Cart';
import { CartItem } from './entities/CartItem';
import { Product } from './entities/Product';
import { requireEnv } from './utils/env';

let dataSource: DataSource | undefined;

export function setDataSource(ds: DataSource): void {
  dataSource = ds;
}

export function getDataSource(): DataSource {
  if (!dataSource) {
    throw new Error('DataSource has not been initialized');
  }
  return dataSource;
}

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: requireEnv('POSTGRES_HOST'),
    port: Number(requireEnv('POSTGRES_PORT')),
    username: requireEnv('POSTGRES_USER'),
    password: requireEnv('POSTGRES_PASSWORD'),
    database: requireEnv('POSTGRES_DB'),
    entities: [Product, Cart, CartItem],
    synchronize: false,
    logging: false,
  });
}

export async function applySchema(dataSource: DataSource): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await dataSource.query(sql);
}
