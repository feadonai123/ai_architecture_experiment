import { Product } from '../entities/Product';

export interface ProductRepository {
  findById(id: string): Promise<Product | null>;
}
