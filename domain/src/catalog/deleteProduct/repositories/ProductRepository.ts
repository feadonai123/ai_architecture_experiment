import { DataSource, IsNull } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { ProductRecord } from '../../../shared/database/ProductRecord';
import { Product } from '../../../shared/entities/Product';

export class ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Product | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .findOne({ where: { id, deletedAt: IsNull() } });
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

  async softDelete(product: Product): Promise<void> {
    await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .save({ ...product });
  }
}
