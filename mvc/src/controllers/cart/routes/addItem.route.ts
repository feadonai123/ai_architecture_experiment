import { NextFunction, Request, Response } from 'express';
import { CartNotFoundError } from '../../../errors/CartNotFoundError';
import { InsufficientStockError } from '../../../errors/InsufficientStockError';
import { InvalidQuantityError } from '../../../errors/InvalidQuantityError';
import { ProductNotFoundError } from '../../../errors/ProductNotFoundError';
import { Cart } from '../../../models/Cart';
import { CartItem } from '../../../models/CartItem';
import { Product } from '../../../models/Product';
import { presentCart } from '../../../presenters/cart.presenter';

function isValidQuantity(quantity: unknown): quantity is number {
  return typeof quantity === 'number' && Number.isInteger(quantity) && quantity > 0;
}

export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { cartId, productId, quantity } = req.body;

    if (!isValidQuantity(quantity)) {
      throw new InvalidQuantityError(quantity);
    }

    const product = await Product.findById(productId);
    if (!product) {
      throw new ProductNotFoundError(productId);
    }

    const cart = await Cart.findById(cartId);
    if (!cart) {
      throw new CartNotFoundError(cartId);
    }

    const existing = await CartItem.findByCartAndProduct(cartId, productId);
    const nextQuantity = (existing?.quantity ?? 0) + quantity;
    if (nextQuantity > product.stock) {
      throw new InsufficientStockError();
    }

    if (existing) {
      existing.quantity = nextQuantity;
      await CartItem.save(existing);
    } else {
      await CartItem.createItem({ cartId, productId, quantity });
    }

    const updated = await Cart.findWithItems(cartId);
    res.status(201).json(presentCart(updated!));
  } catch (error) {
    next(error);
  }
}
