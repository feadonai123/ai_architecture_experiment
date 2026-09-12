import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../shared/base/router.base';
import { presentCart } from '../../../shared/presenters/cart.presenter';
import { CreateCart } from '../usecases/CreateCart';

export class CreateCartController extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly createCart: CreateCart,
  ) {
    super(dataSource);
  }

  async handle(_request: Request, response: Response): Promise<void> {
    const cart = await this.createCart.run();
    response.status(201).json(presentCart(cart));
  }
}
