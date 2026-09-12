import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../database';
import { CartItem as CartItemEntity } from '../entities/CartItem';

export class CartItem {
  static findByCartAndProduct(cartId: string, productId: string): Promise<CartItemEntity | null> {
    return getDataSource().getRepository(CartItemEntity).findOne({ where: { cartId, productId } });
  }

  static async createItem(input: {
    cartId: string;
    productId: string;
    quantity: number;
  }): Promise<CartItemEntity> {
    const repository = getDataSource().getRepository(CartItemEntity);
    return repository.save(
      repository.create({
        id: uuidv4(),
        cartId: input.cartId,
        productId: input.productId,
        quantity: input.quantity,
      }),
    );
  }

  static save(item: CartItemEntity): Promise<CartItemEntity> {
    return getDataSource().getRepository(CartItemEntity).save(item);
  }

  static async remove(item: CartItemEntity): Promise<void> {
    await getDataSource().getRepository(CartItemEntity).remove(item);
  }
}
