import { NextFunction, Request, Response } from 'express';
import { CartItemNotFoundError } from '../../../errors/CartItemNotFoundError';
import { CartNotFoundError } from '../../../errors/CartNotFoundError';
import { Cart } from '../../../models/Cart';
import { CartItem } from '../../../models/CartItem';
import { presentCart } from '../../../presenters/cart.presenter';

export async function removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const productId = req.params.productId;
    const cartId = String(req.query.cartId ?? '');

    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new CartNotFoundError(cartId);
    }

    const item = await CartItem.findByCartAndProduct(cartId, productId);
    if (!item) {
      throw new CartItemNotFoundError(productId);
    }

    await CartItem.remove(item);
    const updated = await Cart.findWithItems(cartId);
    res.status(200).json(presentCart(updated!));
  } catch (error) {
    next(error);
  }
}
