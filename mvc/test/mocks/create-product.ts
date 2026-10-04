import { Product } from '../../src/entities/Product';

export const productMock = {
  id: 'product-1',
  name: 'Tea',
  slug: 'tea',
  description: '',
  price: 10,
  stock: 10,
} as Product;

export const createdProductMock = {
  ...productMock,
  stock: 0,
} as Product;
