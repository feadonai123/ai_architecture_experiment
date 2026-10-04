import { Product } from '../../src/shared/entities/Product';

export const productMock = new Product('product-1', 'Tea', '', 10, 10);
export const missingProductMock = new Product('missing-product', 'Missing', '', 0, 0);
export const emptiedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.description,
  productMock.price,
  0,
);
export const updatedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.description,
  productMock.price,
  25,
);
export const invalidAbsoluteQuantityMock = -1;
export const updateQuantityMock = 25;
