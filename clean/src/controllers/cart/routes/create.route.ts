import { NextFunction, Request, Response } from 'express';
import { presentCart } from '../../../presenters/cart.presenter';
import { CreateCart } from '../../../usecases/CreateCart';

export function create(useCase: CreateCart) {
  return async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await useCase.execute();
      res.status(201).json(presentCart(cart));
    } catch (error) {
      next(error);
    }
  };
}
