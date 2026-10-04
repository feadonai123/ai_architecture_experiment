import { Product } from '../../src/shared/entities/Product';

export const productMock = new Product('product-1', 'Tea', 'tea', '', 10, 10);
export const createdProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.slug,
  productMock.description,
  productMock.price,
  0,
);
