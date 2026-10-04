import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../base/router.base';
import { presentProduct } from '../../../presenters/product.presenter';
import { UpdateProduct } from '../../../usecases/UpdateProduct';

export class UpdateProductRoute extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly operation: UpdateProduct,
  ) {
    super(dataSource);
  }

  async handle(request: Request, response: Response): Promise<void> {
    const result = await this.operation.run({
      productId: request.params.productId,
      name: request.body?.name,
      slug: request.body?.slug,
      description: request.body?.description,
      price: request.body?.price,
    });
    response.status(200).json(presentProduct(result));
  }
}
