import { OrderItem } from '../entities/OrderItem';

export function presentOrderItem(item: OrderItem) {
  return {
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
  };
}
