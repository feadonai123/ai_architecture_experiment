import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { RouterBase } from '../../../base/router.base';
import { presentProduct } from '../../../presenters/product.presenter';
import { ListStocks } from '../../../usecases/ListStocks';
export class ListStocksRoute extends RouterBase {
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
