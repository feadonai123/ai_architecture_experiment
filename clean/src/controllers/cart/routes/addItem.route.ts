import { NextFunction, Request, Response } from 'express';
import { presentCart } from '../../../presenters/cart.presenter';
import { AddCartItem } from '../../../usecases/AddCartItem';

export function addItem(useCase: AddCartItem) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await useCase.execute({
        cartId: req.body.cartId,
        productId: req.body.productId,
        quantity: req.body.quantity,
      });
      res.status(201).json(presentCart(cart));
    } catch (error) {
      next(error);
    }
  };
}
