import { Order } from '../../src/entities/Order';
import { OrderItem } from '../../src/entities/OrderItem';
import { Product } from '../../src/entities/Product';
import { User } from '../../src/entities/User';
import { OrderStatus } from '../../src/enums/OrderStatus';

export const userMock = {
  id: 'user-1',
} as User;

export const orderProductMock = {
  id: 'product-1',
  name: 'Tea',
  slug: 'tea',
  description: '',
  price: 10,
  stock: 10,
  deletedAt: null,
} as Product;

export const createOrderInputMock = {
  userId: userMock.id,
  items: [
    { productId: orderProductMock.id, quantity: 1 },
    { productId: orderProductMock.id, quantity: 2 },
  ],
};

export function orderItemsMock(): OrderItem[] {
  return createOrderInputMock.items.map((item, index) => ({
    id: `id-${index + 2}`,
    orderId: 'id-1',
    productId: item.productId,
    quantity: item.quantity,
    unitPrice: orderProductMock.price,
  })) as OrderItem[];
}

export function orderMock(): Order {
  return {
    id: 'id-1',
    userId: userMock.id,
    status: OrderStatus.PENDING,
    total: 30,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    items: [],
  } as unknown as Order;
}
