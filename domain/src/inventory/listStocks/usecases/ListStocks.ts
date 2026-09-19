import { UseCase } from '../../../shared/base/useCase.base';
import { Product } from '../../../shared/entities/Product';

export class ListStocks extends UseCase<[], Product[]> {
  constructor(private readonly products: { findAll(): Promise<Product[]> }) {
    super();
  }
  protected async execute(): Promise<Product[]> {
    return this.products.findAll();
  }
}
