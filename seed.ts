import fs from 'node:fs';
import path from 'node:path';
import dotenv from 'dotenv';
import { DataSource } from 'typeorm';

dotenv.config({ path: path.resolve(__dirname, '.env') });

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

const users = [
  { id: '00000000-0000-4000-8000-000000000101' },
  { id: '00000000-0000-4000-8000-000000000102' },
];

const products = [
  {
    id: '00000000-0000-4000-8000-000000000201',
    name: 'Teclado mecânico',
    slug: 'teclado-mecanico',
    description: 'Teclado mecânico para jogos e produtividade',
    price: 250,
    stock: 10,
  },
  {
    id: '00000000-0000-4000-8000-000000000202',
    name: 'Mouse sem fio',
    slug: 'mouse-sem-fio',
    description: 'Mouse sem fio ergonômico',
    price: 120.5,
    stock: 20,
  },
  {
    id: '00000000-0000-4000-8000-000000000203',
    name: 'Monitor 24 polegadas',
    slug: 'monitor-24-polegadas',
    description: 'Monitor Full HD de 24 polegadas',
    price: 899.9,
    stock: 5,
  },
  {
    id: '00000000-0000-4000-8000-000000000204',
    name: 'Produto sem estoque',
    slug: 'produto-sem-estoque',
    description: 'Produto para testar cenários sem estoque',
    price: 50,
    stock: 0,
  },
];

function createSeedDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    host: requireEnv('POSTGRES_HOST'),
    port: Number(requireEnv('POSTGRES_PORT')),
    username: requireEnv('POSTGRES_USER'),
    password: requireEnv('POSTGRES_PASSWORD'),
    database: requireEnv('POSTGRES_DB'),
    entities: [],
    synchronize: false,
    logging: false,
  });
}

async function seed(): Promise<void> {
  const dataSource = createSeedDataSource();
  await dataSource.initialize();

  try {
    const schema = fs.readFileSync(path.resolve(__dirname, 'db/schema.sql'), 'utf8');
    await dataSource.query(schema);

    await dataSource.transaction(async (manager) => {
      for (const user of users) {
        await manager.query(
          `INSERT INTO users (id)
           VALUES ($1)
           ON CONFLICT (id) DO NOTHING`,
          [user.id],
        );
      }

      for (const product of products) {
        await manager.query(
          `INSERT INTO products (id, name, slug, description, price, stock, deleted_at)
           VALUES ($1, $2, $3, $4, $5, $6, NULL)
           ON CONFLICT (id) DO UPDATE
           SET name = EXCLUDED.name,
               slug = EXCLUDED.slug,
               description = EXCLUDED.description,
               price = EXCLUDED.price,
               stock = EXCLUDED.stock,
               deleted_at = EXCLUDED.deleted_at`,
          [
            product.id,
            product.name,
            product.slug,
            product.description,
            product.price,
            product.stock,
          ],
        );
      }
    });

    console.log('Seed concluído com sucesso.');
    console.table(users);
    console.table(products);
    console.log('Exemplo para POST /orders:');
    console.log(
      JSON.stringify(
        {
          userId: users[0].id,
          items: [
            { productId: products[0].id, quantity: 2 },
            { productId: products[1].id, quantity: 1 },
          ],
        },
        null,
        2,
      ),
    );
  } finally {
    await dataSource.destroy();
  }
}

seed().catch((error) => {
  console.error('Falha ao executar o seed:', error);
  process.exitCode = 1;
});
