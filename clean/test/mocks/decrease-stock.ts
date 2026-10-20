import { Product } from '../../src/entities/Product';

export const productMock = new Product('product-1', 'Tea', 'tea', '', 10, 10);
export const missingProductMock = new Product('missing-product', 'Missing', 'missing', '', 0, 0);
export const decreasedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.slug,
  productMock.description,
  productMock.price,
  6,
);
export const emptiedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.slug,
  productMock.description,
  productMock.price,
  0,
);
export const invalidQuantityMock = 0;
export const decreaseQuantityMock = 4;
export const exceedingQuantityMock = 11;
