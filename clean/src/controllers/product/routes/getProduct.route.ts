import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../base/router.base';
import { presentProduct } from '../../../presenters/product.presenter';
import { GetProduct } from '../../../usecases/GetProduct';

export class GetProductRoute extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly operation: GetProduct,
  ) {
    super(dataSource);
  }

  async handle(request: Request, response: Response): Promise<void> {
    const result = await this.operation.run(request.params.productId);
    response.status(200).json(presentProduct(result));
  }
}
