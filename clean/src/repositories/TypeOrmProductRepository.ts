import { DataSource } from 'typeorm';
import { Product } from '../entities/Product';
import { ProductRepository } from '../ports/ProductRepository';
import { ProductRecord } from '../infrastructure/typeorm/ProductRecord';

export class TypeOrmProductRepository implements ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Product | null> {
    const record = await this.dataSource.getRepository(ProductRecord).findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return new Product(record.id, record.name, record.price, record.stock);
  }
}
