import { DataSource, IsNull } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { ProductRecord } from '../../../shared/database/ProductRecord';
import { Product } from '../../../shared/entities/Product';

export class ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findAll(): Promise<Product[]> {
    const records = await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .find({ where: { deletedAt: IsNull() }, order: { id: 'ASC' } });
    return records.map(
      (record) =>
        new Product(
          record.id,
          record.name,
          record.slug,
          record.description,
          record.price,
          record.stock,
          record.deletedAt,
        ),
    );
  }
}
