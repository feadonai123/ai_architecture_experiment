import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../shared/base/router.base';
import { presentCart } from '../../../shared/presenters/cart.presenter';
import { GetCart } from '../usecases/GetCart';

export class GetCartController extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly getCart: GetCart,
  ) {
    super(dataSource);
  }

  async handle(request: Request, response: Response): Promise<void> {
    const cart = await this.getCart.run(request.params.cartId);
    response.status(200).json(presentCart(cart));
  }
}
