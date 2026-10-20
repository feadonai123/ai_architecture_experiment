import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { ProductRecord } from '../../../shared/database/ProductRecord';
import { Product } from '../../../shared/entities/Product';

export class ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async save(product: Product): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .update(product.id, { stock: product.stock });
  }

  async findByIdForUpdate(id: string): Promise<Product | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .findOne({ where: { id }, lock: { mode: 'pessimistic_write' } });
    if (!record) return null;
    return new Product(
      record.id,
      record.name,
      record.slug,
      record.description,
      record.price,
      record.stock,
      record.deletedAt,
    );
  }
}
