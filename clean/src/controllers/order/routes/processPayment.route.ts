import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouteResponse, RouterBase } from '../../../base/router.base';
import { OrderPaymentStatus } from '../../../entities/OrderPaymentStatus';
import { presentOrderPayment } from '../../../presenters/orderPayment.presenter';
import { PaymentDeclinedError } from '../../../errors/PaymentDeclinedError';
import { ProcessOrderPayment } from '../../../usecases/ProcessOrderPayment';

export class ProcessOrderPaymentRoute extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly processPayment: ProcessOrderPayment,
  ) {
    super(dataSource);
  }
  async handle(request: Request, _response: Response): Promise<RouteResponse> {
    const payment = await this.processPayment.run(
      request.params.orderId,
      request.body?.paymentToken,
    );
    if (payment.status === OrderPaymentStatus.DECLINED) {
      const error = new PaymentDeclinedError(payment.orderId);
      return {
        statusCode: error.statusCode,
        body: { error: error.name, message: error.message, statusCode: error.statusCode },
      };
    }
    return { statusCode: 200, body: presentOrderPayment(payment) };
  }
}
