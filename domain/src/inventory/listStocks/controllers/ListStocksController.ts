import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../shared/base/router.base';
import { presentProduct } from '../../../shared/presenters/product.presenter';
import { ListStocks } from '../usecases/ListStocks';
export class ListStocksController extends RouterBase {
  constructor(
    dataSource: DataSource,
    private readonly operation: ListStocks,
  ) {
    super(dataSource);
  }
  async handle(request: Request, response: Response): Promise<void> {
    const result = await this.operation.run();
    response.status(200).json(result.map(presentProduct));
  }
}
