import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { Cart } from '../entities/Cart';
import { wrap } from '../helpers';
import { presentCart } from '../presenters/cart.presenter';

export async function createCart(dataSource: DataSource): Promise<Cart> {
  const repository = dataSource.getRepository(Cart);
  const cart = repository.create({
    id: uuidv4(),
    createdAt: new Date(),
    items: [],
  });
  return repository.save(cart);
}

export function createCartRoute(dataSource: DataSource) {
  return wrap(async (_req, res) => {
    const cart = await createCart(dataSource);
    res.status(201).json(presentCart(cart));
  });
}
