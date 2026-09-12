import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../database';
import { Cart as CartEntity } from '../entities/Cart';
import { CartItem as CartItemEntity } from '../entities/CartItem';

export class Cart {
  static async createEmpty(): Promise<CartEntity> {
    const repository = getDataSource().getRepository(CartEntity);
    const cart = repository.create({
      id: uuidv4(),
      createdAt: new Date(),
      items: [],
    });
    return repository.save(cart);
  }

  static findById(id: string): Promise<CartEntity | null> {
    return getDataSource().getRepository(CartEntity).findOne({ where: { id } });
  }

  static async findWithItems(id: string): Promise<CartEntity | null> {
    const cart = await Cart.findById(id);
    if (!cart) {
      return null;
    }
    cart.items = await getDataSource()
      .getRepository(CartItemEntity)
      .find({ where: { cartId: id } });
    return cart;
  }
}
