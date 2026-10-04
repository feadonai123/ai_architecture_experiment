import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { ProductRecord } from '../../../shared/database/ProductRecord';
import { Product } from '../../../shared/entities/Product';

export class ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findBySlug(slug: string): Promise<Product | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .findOne({ where: { slug } });
    return record
      ? new Product(
          record.id,
          record.name,
          record.slug,
          record.description,
          record.price,
          record.stock,
          record.deletedAt,
        )
      : null;
  }

  async create(product: Product): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .save({ ...product });
  }
}
