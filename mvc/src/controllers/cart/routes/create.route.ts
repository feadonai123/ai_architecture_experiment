import { NextFunction, Request, Response } from 'express';
import { Cart } from '../../../models/Cart';
import { presentCart } from '../../../presenters/cart.presenter';

export async function create(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cart = await Cart.createEmpty();
    res.status(201).json(presentCart(cart));
  } catch (error) {
    next(error);
  }
}
