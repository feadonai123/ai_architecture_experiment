import { Product } from '../../src/entities/Product';

export const productMock = {
  id: 'product-1',
  name: 'Tea',
  slug: 'tea',
  description: '',
  price: 10,
  stock: 10,
} as Product;

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
  slug: 'missing',
} as Product;

export const invalidAbsoluteQuantityMock = -1;
export const updateQuantityMock = 25;
