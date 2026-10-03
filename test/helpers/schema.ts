import fs from 'node:fs';
import path from 'node:path';
import { DataSource } from 'typeorm';

export async function applySchema(dataSource: DataSource): Promise<void> {
  const schemaPath = path.resolve(__dirname, '../../db/schema.sql');
  const sql = fs.readFileSync(schemaPath, 'utf8');
  await dataSource.query(sql);
}

export async function truncateAll(dataSource: DataSource): Promise<void> {
  await dataSource.query(
    'TRUNCATE order_payments, order_items, orders, cart_items, carts, users, products RESTART IDENTITY CASCADE',
  );
}
