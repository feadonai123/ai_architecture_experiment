import { NextFunction, Request, Response } from 'express';
import { presentCart } from '../../../shared/presenters/cart.presenter';
import { CreateCart } from '../usecases/CreateCart';

export class CreateCartController {
  constructor(private readonly createCart: CreateCart) {}

  handle = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await this.createCart.execute();
      res.status(201).json(presentCart(cart));
    } catch (error) {
      next(error);
    }
  };
}
