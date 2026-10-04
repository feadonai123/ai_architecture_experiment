import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../shared/base/router.base';
import { presentProduct } from '../../../shared/presenters/product.presenter';
import { DeleteProduct } from '../usecases/DeleteProduct';

export class DeleteProductController extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly operation: DeleteProduct,
  ) {
    super(dataSource);
  }

  async handle(request: Request, response: Response): Promise<void> {
    const result = await this.operation.run(request.params.productId);
    response.status(200).json(presentProduct(result));
  }
}
