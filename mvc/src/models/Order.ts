import { v4 as uuidv4 } from 'uuid';
import { getDataSource } from '../database';
import { Order as OrderEntity } from '../entities/Order';
import { OrderItem as OrderItemEntity } from '../entities/OrderItem';

export type CreateOrderItem = {
  productId: string;
  quantity: number;
  unitPrice: number;
};

export class Order {
  static createWithItems(userId: string, items: CreateOrderItem[]): Promise<OrderEntity> {
    return getDataSource().transaction(async (manager) => {
      const orderRepository = manager.getRepository(OrderEntity);
      const orderItemRepository = manager.getRepository(OrderItemEntity);
      const orderId = uuidv4();
      const orderItems = items.map((item) =>
        orderItemRepository.create({
          id: uuidv4(),
          orderId,
          productId: item.productId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }),
      );
      const totalInCents = orderItems.reduce(
        (total, item) => total + item.quantity * Math.round(item.unitPrice * 100),
        0,
      );
      const order = orderRepository.create({
        id: orderId,
        userId,
        status: 'PENDING',
        total: totalInCents / 100,
        createdAt: new Date(),
        items: orderItems,
      });

      const savedOrder = await orderRepository.save(order);
      savedOrder.items = await orderItemRepository.save(orderItems);
      return savedOrder;
    });
  }
}
