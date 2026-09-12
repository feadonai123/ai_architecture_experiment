import { Request, Response } from 'express';
import { CartNotFoundError } from '../../src/errors/CartNotFoundError';
import { InsufficientStockError } from '../../src/errors/InsufficientStockError';
import { InvalidQuantityError } from '../../src/errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../src/errors/ProductNotFoundError';
import { addItem } from '../../src/controllers/cart/routes/addItem.route';
import {
  cartMock,
  cartWithIncrementedItemMock,
  cartWithItemMock,
  exceedingQuantityMock,
  existingItemMock,
  incrementQuantityMock,
  incrementedItemResponseMock,
  invalidQuantityMock,
  itemMock,
  itemResponseMock,
  lowStockProductMock,
  missingCartMock,
  missingProductMock,
  productMock,
} from '../mocks/add-item';
import { mockCartFindById, mockCartFindWithItems } from '../mocks/cart';
import {
  mockCartItemCreateItem,
  mockCartItemFindByCartAndProduct,
  mockCartItemSave,
} from '../mocks/cartItem';
import { mockRes } from '../mocks/http';
import { mockProductFindById } from '../mocks/product';

async function invokeHandler(
  handler: (req: Request, res: Response, next: (err?: unknown) => void) => Promise<void>,
  req: Partial<Request>,
) {
  const res = mockRes();
  const next = jest.fn();
  await handler(req as Request, res, next);
  if (next.mock.calls[0]?.[0]) {
    throw next.mock.calls[0][0];
  }
  return res.json.mock.calls[0]?.[0];
}

function addCartItem(input: { cartId: string; productId: string; quantity: unknown }) {
  return invokeHandler(addItem, { body: input });
}

describe('add item', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('success', () => {
    it('creates a new cart item', async () => {
      mockProductFindById(productMock);
      mockCartFindById(cartMock);
      mockCartItemFindByCartAndProduct(null);
      mockCartItemCreateItem(itemMock);
      mockCartFindWithItems(cartWithItemMock);

      const result = await addCartItem({
        cartId: cartMock.id,
        productId: productMock.id,
        quantity: itemMock.quantity,
      });

      expect(result.items).toEqual([itemResponseMock]);
    });

    it('increments existing item quantity', async () => {
      mockProductFindById(productMock);
      mockCartFindById(cartMock);
      mockCartItemFindByCartAndProduct(existingItemMock);
      mockCartItemSave(existingItemMock);
      mockCartFindWithItems(cartWithIncrementedItemMock);

      const result = await addCartItem({
        cartId: cartMock.id,
        productId: productMock.id,
        quantity: incrementQuantityMock,
      });

      expect(result.items[0].quantity).toBe(incrementedItemResponseMock.quantity);
    });
  });

  describe('errors', () => {
    it('throws InvalidQuantityError', async () => {
      await expect(
        addCartItem({
          cartId: cartMock.id,
          productId: productMock.id,
          quantity: invalidQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InvalidQuantityError);
    });

    it('throws ProductNotFoundError', async () => {
      mockProductFindById(null);
      await expect(
        addCartItem({
          cartId: cartMock.id,
          productId: missingProductMock.id,
          quantity: itemMock.quantity,
        }),
      ).rejects.toBeInstanceOf(ProductNotFoundError);
    });

    it('throws CartNotFoundError', async () => {
      mockProductFindById(productMock);
      mockCartFindById(null);
      await expect(
        addCartItem({
          cartId: missingCartMock.id,
          productId: productMock.id,
          quantity: itemMock.quantity,
        }),
      ).rejects.toBeInstanceOf(CartNotFoundError);
    });

    it('throws InsufficientStockError', async () => {
      mockProductFindById(lowStockProductMock);
      mockCartFindById(cartMock);
      mockCartItemFindByCartAndProduct(null);
      await expect(
        addCartItem({
          cartId: cartMock.id,
          productId: productMock.id,
          quantity: exceedingQuantityMock,
        }),
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });
  });
});
