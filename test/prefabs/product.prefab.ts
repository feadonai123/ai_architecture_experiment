import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { ProductRecord } from '../persistence/product.record';

type ProductOverrides = Partial<Pick<ProductRecord, 'id' | 'name' | 'price' | 'stock'>>;

export class ProductPrefab {
  static async create(
    dataSource: DataSource,
    overrides: ProductOverrides = {},
  ): Promise<ProductRecord> {
    const repository = dataSource.getRepository(ProductRecord);
    const product = repository.create({
      id: overrides.id ?? uuidv4(),
      name: overrides.name ?? 'Test Product',
      price: overrides.price ?? 100,
      stock: overrides.stock ?? 10,
    });
    return repository.save(product);
  }
}
