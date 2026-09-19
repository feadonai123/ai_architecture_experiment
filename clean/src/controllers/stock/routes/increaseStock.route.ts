import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../base/router.base';
import { presentProduct } from '../../../presenters/product.presenter';
import { IncreaseStock } from '../../../usecases/IncreaseStock';
export class IncreaseStockRoute extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly operation: IncreaseStock,
  ) {
    super(dataSource);
  }
  async handle(request: Request, response: Response): Promise<void> {
    const result = await this.operation.run({
      productId: request.params.productId,
      quantity: request.body?.quantity,
    });
    response.status(200).json(presentProduct(result));
  }
}
