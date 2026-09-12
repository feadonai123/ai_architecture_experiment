import { NextFunction, Request, Response } from 'express';
import { presentCart } from '../../../presenters/cart.presenter';
import { RemoveCartItem } from '../../../usecases/RemoveCartItem';

export function removeItem(useCase: RemoveCartItem) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await useCase.execute(String(req.query.cartId ?? ''), req.params.productId);
      res.status(200).json(presentCart(cart));
    } catch (error) {
      next(error);
    }
  };
}
