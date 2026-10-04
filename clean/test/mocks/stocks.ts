import { Product } from '../../src/entities/Product';

export const productMock = new Product('product-1', 'Tea', 10, 10);
export const secondProductMock = new Product('product-2', 'Coffee', 20, 5);
export const missingProductMock = new Product('missing-product', 'Missing', 0, 0);
export const increasedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.price,
  15,
);
export const decreasedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.price,
  6,
);
export const emptiedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.price,
  0,
);
export const updatedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.price,
  25,
);
export const invalidQuantityMock = 0;
export const invalidAbsoluteQuantityMock = -1;
export const increaseQuantityMock = 5;
export const decreaseQuantityMock = 4;
export const updateQuantityMock = 25;
export const exceedingQuantityMock = 11;
