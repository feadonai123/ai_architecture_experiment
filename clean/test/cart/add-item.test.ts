import { CartNotFoundError } from '../../src/errors/CartNotFoundError';
import { InsufficientStockError } from '../../src/errors/InsufficientStockError';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { AddCartItem } from '../../src/usecases/AddCartItem';
import {
  cartMock,
  cartWithIncrementedItemMock,
  cartWithItemMock,
  createItemIdMock,
  exceedingQuantityMock,
  incrementQuantityMock,
  incrementedItemMock,
  invalidQuantityMock,
  itemMock,
  lowStockProductMock,
  missingCartMock,
  missingProductMock,
  productMock,
} from '../mocks/add-item';
import { mockCartRepository } from '../mocks/cart';
import { mockCartItemRepository } from '../mocks/cartItem';
import { mockProductRepository } from '../mocks/product';

function addCartItem(
  products = mockProductRepository({ findById: productMock }),
  carts = mockCartRepository({ findById: cartMock, findWithItems: cartMock }),
  cartItems = mockCartItemRepository(),
) {
  return new AddCartItem(products, carts, cartItems, createItemIdMock);
}

describe('add item', () => {
  describe('success', () => {
    it('creates a new cart item', async () => {
      const result = await addCartItem(
        mockProductRepository({ findById: productMock }),
        mockCartRepository({ findById: cartMock, findWithItems: cartWithItemMock }),
        mockCartItemRepository({ findByCartAndProduct: null }),
      ).run({
        cartId: cartMock.id,
        productId: productMock.id,
        quantity: itemMock.quantity,
      });

      expect(result.items).toEqual([itemMock]);
    });

    it('increments existing item quantity', async () => {
      const result = await addCartItem(
        mockProductRepository({ findById: productMock }),
        mockCartRepository({ findById: cartMock, findWithItems: cartWithIncrementedItemMock }),
        mockCartItemRepository({ findByCartAndProduct: itemMock }),
      ).run({
        cartId: cartMock.id,
        productId: productMock.id,
        quantity: incrementQuantityMock,
      });

      expect(result.items[0].quantity).toBe(incrementedItemMock.quantity);
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      await expect(
        addCartItem().run({
          cartId: cartMock.id,
          productId: productMock.id,
          quantity: invalidQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      await expect(
        addCartItem(mockProductRepository({ findById: null })).run({
          cartId: cartMock.id,
          productId: missingProductMock.id,
          quantity: itemMock.quantity,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws CartNotFoundError', async () => {
      await expect(
        addCartItem(
          mockProductRepository({ findById: productMock }),
          mockCartRepository({ findById: null }),
        ).run({
          cartId: missingCartMock.id,
          productId: productMock.id,
          quantity: itemMock.quantity,
        }),
      ).rejects.toBeInstanceOf(CartNotFoundError);
    });

    it('throws InsufficientStockError', async () => {
      await expect(
        addCartItem(mockProductRepository({ findById: lowStockProductMock })).run({
          cartId: cartMock.id,
          productId: productMock.id,
          quantity: exceedingQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });
  });
});
