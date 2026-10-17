import { Product } from '../../src/entities/Product';
import { User } from '../../src/entities/User';

export const userMock = {
  id: 'user-1',
} as User;

export const orderProductMock = {
  id: 'product-1',
  name: 'Tea',
  slug: 'tea',
  description: '',
  price: 10,
  stock: 10,
  deletedAt: null,
} as Product;

export const createOrderInputMock = {
  userId: userMock.id,
  items: [
    { productId: orderProductMock.id, quantity: 1 },
    { productId: orderProductMock.id, quantity: 2 },
  ],
};
