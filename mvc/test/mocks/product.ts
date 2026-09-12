import { Product } from '../../src/models/Product';
import { Product as ProductEntity } from '../../src/entities/Product';

export function mockProductFindById(value: ProductEntity | null) {
  return jest.spyOn(Product, 'findById').mockResolvedValue(value);
}
