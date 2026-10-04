import { Cart } from '../../src/entities/Cart';
import { CartItem } from '../../src/entities/CartItem';
import { Product } from '../../src/entities/Product';

export const productMock = new Product('product-1', 'Tea', 'tea', '', 10, 10);
export const cartMock = new Cart('cart-1', new Date('2026-01-01T00:00:00.000Z'), []);
export const itemMock = new CartItem('item-1', cartMock.id, productMock.id, 2);
export const incrementedItemMock = new CartItem(
  itemMock.id,
  itemMock.cartId,
  itemMock.productId,
  5,
);
export const cartWithItemMock = new Cart(cartMock.id, cartMock.createdAt, [itemMock]);
export const cartWithIncrementedItemMock = new Cart(cartMock.id, cartMock.createdAt, [
  incrementedItemMock,
]);
export const lowStockProductMock = new Product(
  productMock.id,
  productMock.name,
  productMock.slug,
  productMock.description,
  productMock.price,
  2,
);
export const missingCartMock = new Cart('missing-cart', cartMock.createdAt, []);
export const missingProductMock = new Product('missing-product', 'Missing', 'missing', '', 0, 0);
export const invalidQuantityMock = 0;
export const incrementQuantityMock = 3;
export const exceedingQuantityMock = 5;
export const createItemIdMock = () => itemMock.id;
