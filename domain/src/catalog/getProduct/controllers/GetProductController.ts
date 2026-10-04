import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../shared/base/router.base';
import { presentProduct } from '../../../shared/presenters/product.presenter';
import { GetProduct } from '../usecases/GetProduct';

export class GetProductController extends RouterBase {
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
