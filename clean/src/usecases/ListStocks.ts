import { UseCase } from '../base/useCase.base';
import { Product } from '../entities/Product';
import { ProductRepository } from '../ports/ProductRepository';

export class ListStocks extends UseCase<[], Product[]> {
  constructor(private readonly products: Pick<ProductRepository, 'findAll'>) {
    super();
  }
  protected async execute(): Promise<Product[]> {
    return this.products.findAll();
  }
}
