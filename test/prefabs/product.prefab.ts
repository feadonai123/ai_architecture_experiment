import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProductRecord } from '../persistence/product.record';

type ProductOverrides = Partial<
  Pick<ProductRecord, 'id' | 'name' | 'slug' | 'description' | 'price' | 'stock' | 'deletedAt'>
>;

export class ProductPrefab {
  static async create(
    dataSource: DataSource,
    overrides: ProductOverrides = {},
  ): Promise<ProductRecord> {
    const repository = dataSource.getRepository(ProductRecord);
    const id = overrides.id ?? uuidv4();
    const product = repository.create({
      id,
      name: overrides.name ?? 'Test Product',
      slug: overrides.slug ?? `product-${id}`,
      description: overrides.description ?? '',
      price: overrides.price ?? 100,
      stock: overrides.stock ?? 10,
      deletedAt: overrides.deletedAt ?? null,
    });
    return repository.save(product);
  }
}
