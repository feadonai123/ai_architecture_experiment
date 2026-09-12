import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../base/router.base';
import { presentCart } from '../../../presenters/cart.presenter';
import { AddCartItem } from '../../../usecases/AddCartItem';

export class AddItemRoute extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly addCartItem: AddCartItem,
  ) {
    super(dataSource);
  }

  async handle(request: Request, response: Response): Promise<void> {
    const cart = await this.addCartItem.run({
      cartId: request.body.cartId,
      productId: request.body.productId,
      quantity: request.body.quantity,
    });
    response.status(201).json(presentCart(cart));
  }
}
