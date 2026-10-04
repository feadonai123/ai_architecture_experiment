import { Product } from '../../src/entities/Product';

export const productMock = new Product('product-1', 'Tea', '', 10, 10);
export const secondProductMock = new Product('product-2', 'Coffee', '', 20, 5);
export const unavailableProductMock = new Product('product-3', 'Sold Out', '', 10, 0);
