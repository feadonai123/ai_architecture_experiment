import { NextFunction, Request, Response } from 'express';
import { presentCart } from '../../../shared/presenters/cart.presenter';
import { AddCartItem } from '../usecases/AddCartItem';

export class AddCartItemController {
  constructor(private readonly addCartItem: AddCartItem) {}

  handle = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const cart = await this.addCartItem.execute({
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
