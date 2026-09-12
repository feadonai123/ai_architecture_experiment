import { DataSource } from 'typeorm';
import { Cart } from '../../src/entities/Cart';
import { CartItem } from '../../src/entities/CartItem';
import { Product } from '../../src/entities/Product';

export function mockDataSource(repos: {
  product?: Partial<Record<string, jest.Mock>>;
  cart?: Partial<Record<string, jest.Mock>>;
  cartItem?: Partial<Record<string, jest.Mock>>;
}): DataSource {
  return {
    getRepository: jest.fn((entity) => {
      if (entity === Product) return repos.product;
      if (entity === Cart) return repos.cart;
      if (entity === CartItem) return repos.cartItem;
      throw new Error('unknown entity');
    }),
  } as unknown as DataSource;
}
