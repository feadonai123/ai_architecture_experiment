import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../base/router.base';
import { presentProduct } from '../../../presenters/product.presenter';
import { ListProducts } from '../../../usecases/ListProducts';

export class ListProductsRoute extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly operation: ListProducts,
  ) {
    super(dataSource);
  }

  async handle(request: Request, response: Response): Promise<void> {
    const result = await this.operation.run({
      name: request.query.name,
      minPrice: request.query.minPrice,
      maxPrice: request.query.maxPrice,
      available: request.query.available,
    });
    response.status(200).json(result.map(presentProduct));
  }
}
