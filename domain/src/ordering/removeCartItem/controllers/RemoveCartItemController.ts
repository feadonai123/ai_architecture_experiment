import { NextFunction, Request, Response } from 'express';
import { presentCart } from '../../../shared/presenters/cart.presenter';
import { RemoveCartItem } from '../usecases/RemoveCartItem';

export class RemoveCartItemController {
  constructor(private readonly removeCartItem: RemoveCartItem) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await this.removeCartItem.execute(
        String(req.query.cartId ?? ''),
        req.params.productId,
      );
      res.status(200).json(presentCart(cart));
    } catch (error) {
      next(error);
    }
  };
}
