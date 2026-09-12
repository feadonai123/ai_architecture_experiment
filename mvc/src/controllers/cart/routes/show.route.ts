import { NextFunction, Request, Response } from 'express';
import { CartNotFoundError } from '../../../errors/CartNotFoundError';
import { Cart } from '../../../models/Cart';
import { presentCart } from '../../../presenters/cart.presenter';

export async function show(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cart = await Cart.findWithItems(req.params.cartId);
    if (!cart) {
      throw new CartNotFoundError(req.params.cartId);
    }
    res.status(200).json(presentCart(cart));
  } catch (error) {
    next(error);
  }
}
