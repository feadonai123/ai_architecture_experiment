import { Product } from '../../src/entities/Product';

export const productMock = new Product('product-1', 'Tea', '', 10, 10);
export const missingProductMock = new Product('missing-product', 'Missing', '', 0, 0);
export const increasedProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.description,
  productMock.price,
  15,
);
export const invalidQuantityMock = 0;
export const increaseQuantityMock = 5;
