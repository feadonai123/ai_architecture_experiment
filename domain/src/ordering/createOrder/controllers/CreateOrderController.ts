import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouteResponse, RouterBase } from '../../../shared/base/router.base';
import { presentOrder } from '../../../shared/presenters/order.presenter';
import { CreateOrder } from '../usecases/CreateOrder';

export class CreateOrderController extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly createOrder: CreateOrder,
  ) {
    super(dataSource);
  }

  async handle(request: Request, _response: Response): Promise<RouteResponse> {
    const order = await this.createOrder.run({
      userId: request.body.userId,
      items: request.body.items,
    });
    return { statusCode: 201, body: presentOrder(order) };
  }
}
