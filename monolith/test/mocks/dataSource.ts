import { DataSource } from 'typeorm';
import { Cart } from '../../src/entities/Cart';
import { CartItem } from '../../src/entities/CartItem';
import { Order } from '../../src/entities/Order';
import { OrderItem } from '../../src/entities/OrderItem';
import { Product } from '../../src/entities/Product';
import { User } from '../../src/entities/User';

export function mockDataSource(repos: {
  product?: Partial<Record<string, jest.Mock>>;
  cart?: Partial<Record<string, jest.Mock>>;
  cartItem?: Partial<Record<string, jest.Mock>>;
  user?: Partial<Record<string, jest.Mock>>;
  order?: Partial<Record<string, jest.Mock>>;
  orderItem?: Partial<Record<string, jest.Mock>>;
}): DataSource {
  const getRepository = jest.fn((entity) => {
    if (entity === Product) return repos.product;
    if (entity === Cart) return repos.cart;
    if (entity === CartItem) return repos.cartItem;
    if (entity === User) return repos.user;
    if (entity === Order) return repos.order;
    if (entity === OrderItem) return repos.orderItem;
    throw new Error('unknown entity');
  });

  return {
    getRepository,
    transaction: jest.fn((run) => run({ getRepository })),
  } as unknown as DataSource;
}
