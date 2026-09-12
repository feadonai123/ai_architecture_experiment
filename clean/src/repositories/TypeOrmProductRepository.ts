import { DataSource } from 'typeorm';
import { DbManager } from '../manager/db.manager';
import { Product } from '../entities/Product';
import { ProductRecord } from '../infrastructure/typeorm/ProductRecord';
import { ProductRepository } from '../ports/ProductRepository';

export class TypeOrmProductRepository implements ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Product | null> {
    const record = await DbManager.getManager(this.dataSource)
      .getRepository(ProductRecord)
      .findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return new Product(record.id, record.name, record.price, record.stock);
  }
}
