import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../shared/base/router.base';
import { presentProduct } from '../../../shared/presenters/product.presenter';
import { ListProducts } from '../usecases/ListProducts';

export class ListProductsController extends RouterBase {
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
