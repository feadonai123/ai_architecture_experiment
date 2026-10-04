import { In, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../database';
import { Cart as CartEntity } from '../entities/Cart';
import { CartItem as CartItemEntity } from '../entities/CartItem';
import { Product as ProductEntity } from '../entities/Product';

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
    const items = await getDataSource()
      .getRepository(CartItemEntity)
      .find({ where: { cartId: id } });
    if (items.length === 0) {
      cart.items = [];
      return cart;
    }
    const active = await getDataSource()
      .getRepository(ProductEntity)
      .find({
        where: { id: In(items.map((item) => item.productId)), deletedAt: IsNull() },
      });
    const activeIds = new Set(active.map((product) => product.id));
    cart.items = items.filter((item) => activeIds.has(item.productId));
    return cart;
  }
}
