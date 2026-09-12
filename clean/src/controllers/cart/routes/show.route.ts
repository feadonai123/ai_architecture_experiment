import { NextFunction, Request, Response } from 'express';
import { presentCart } from '../../../presenters/cart.presenter';
import { GetCart } from '../../../usecases/GetCart';

export function show(useCase: GetCart) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await useCase.execute(req.params.cartId);
      res.status(200).json(presentCart(cart));
    } catch (error) {
      next(error);
    }
  };
}
