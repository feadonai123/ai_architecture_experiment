import { Product } from '../../src/entities/Product';

export const productMock = {
  id: 'product-1',
  name: 'Tea',
  price: 10,
  stock: 10,
} as Product;

export const secondProductMock = {
  id: 'product-2',
  name: 'Coffee',
  price: 20,
  stock: 5,
} as Product;

export const missingProductMock = {
  ...productMock,
  id: 'missing-product',
  name: 'Missing',
} as Product;

export const invalidQuantityMock = 0;
export const invalidAbsoluteQuantityMock = -1;
export const increaseQuantityMock = 5;
export const decreaseQuantityMock = 4;
export const updateQuantityMock = 25;
export const exceedingQuantityMock = 11;
