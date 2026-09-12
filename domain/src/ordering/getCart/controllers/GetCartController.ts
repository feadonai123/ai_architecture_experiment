import { NextFunction, Request, Response } from 'express';
import { presentCart } from '../../../shared/presenters/cart.presenter';
import { GetCart } from '../usecases/GetCart';

export class GetCartController {
  constructor(private readonly getCart: GetCart) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await this.getCart.execute(req.params.cartId);
      res.status(200).json(presentCart(cart));
    } catch (error) {
      next(error);
    }
  };
}
