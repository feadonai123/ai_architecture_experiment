import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../base/router.base';
import { presentCart } from '../../../presenters/cart.presenter';
import { RemoveCartItem } from '../../../usecases/RemoveCartItem';

export class RemoveItemRoute extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly removeCartItem: RemoveCartItem,
  ) {
    super(dataSource);
  }

  async handle(request: Request, response: Response): Promise<void> {
    const cart = await this.removeCartItem.run(
      String(request.query.cartId ?? ''),
      request.params.productId,
    );
    response.status(200).json(presentCart(cart));
  }
}
