import { Product } from '../../src/shared/entities/Product';

export const productMock = new Product('product-1', 'Tea', 'tea', '', 10, 10);
export const missingProductMock = new Product('missing-product', 'Missing', 'missing', '', 0, 0);
export const emptiedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.slug,
  productMock.description,
  productMock.price,
  0,
);
export const updatedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.slug,
  productMock.description,
  productMock.price,
  25,
);
export const invalidAbsoluteQuantityMock = -1;
export const updateQuantityMock = 25;
