import { Product } from '../../src/entities/Product';

export const productMock = {
  id: 'product-1',
  name: 'Tea',
  description: '',
  price: 10,
  stock: 10,
} as Product;

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
} as Product;

export const invalidQuantityMock = 0;
export const decreaseQuantityMock = 4;
export const exceedingQuantityMock = 11;
