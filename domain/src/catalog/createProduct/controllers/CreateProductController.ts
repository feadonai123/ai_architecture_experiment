import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../shared/base/router.base';
import { presentProduct } from '../../../shared/presenters/product.presenter';
import { CreateProduct } from '../usecases/CreateProduct';

export class CreateProductController extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly operation: CreateProduct,
  ) {
    super(dataSource);
  }

  async handle(request: Request, response: Response): Promise<void> {
    const result = await this.operation.run({
      name: request.body?.name,
      slug: request.body?.slug,
      description: request.body?.description,
      price: request.body?.price,
    });
    response.status(201).json(presentProduct(result));
  }
}
