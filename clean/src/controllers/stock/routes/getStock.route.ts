import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../base/router.base';
import { presentProduct } from '../../../presenters/product.presenter';
import { GetStock } from '../../../usecases/GetStock';
export class GetStockRoute extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly operation: GetStock,
  ) {
    super(dataSource);
  }
  async handle(request: Request, response: Response): Promise<void> {
    const result = await this.operation.run(request.params.productId);
    response.status(200).json(presentProduct(result));
  }
}
