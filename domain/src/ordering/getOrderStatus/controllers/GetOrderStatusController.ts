import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouteResponse, RouterBase } from '../../../shared/base/router.base';
import { GetOrderStatus } from '../usecases/GetOrderStatus';
import { presentOrderStatus } from '../../../shared/presenters/order.presenter';

export class GetOrderStatusController extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly getOrderStatus: GetOrderStatus,
  ) {
    super(dataSource);
  }
  async handle(request: Request, _response: Response): Promise<RouteResponse> {
    const order = await this.getOrderStatus.run(request.params.orderId);
    return { statusCode: 200, body: presentOrderStatus(order) };
  }
}
