import { DataSource } from 'typeorm';
import { Product } from '../../../shared/entities/Product';
import { ProductRecord } from '../../../shared/database/ProductRecord';

export class ProductRepository {
  constructor(private readonly dataSource: DataSource) {}

  async findById(id: string): Promise<Product | null> {
    const record = await this.dataSource.getRepository(ProductRecord).findOne({ where: { id } });
    if (!record) {
      return null;
    }
    return new Product(record.id, record.name, record.price, record.stock);
  }
}
