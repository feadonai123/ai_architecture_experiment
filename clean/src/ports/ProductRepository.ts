import { Product } from '../entities/Product';

export interface ProductRepository {
  findAll(): Promise<Product[]>;
  save(product: Product): Promise<void>;
  findById(id: string): Promise<Product | null>;
}
