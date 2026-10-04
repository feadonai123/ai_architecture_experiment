import { Product } from '../entities/Product';

export type ProductFilters = {
  name?: string;
  minPrice?: number;
  maxPrice?: number;
  available?: boolean;
};

export interface ProductRepository {
  findAll(): Promise<Product[]>;
  findById(id: string): Promise<Product | null>;
  findByFilters(filters: ProductFilters): Promise<Product[]>;
  save(product: Product): Promise<void>;
  create(product: Product): Promise<void>;
  softDelete(product: Product): Promise<void>;
}
