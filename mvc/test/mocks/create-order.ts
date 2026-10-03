import { Order } from '../../src/entities/Order';
import { OrderStatus } from '../../src/enums/OrderStatus';

export const userMock = {
  id: 'user-1',
};

export const productsMock = [
  {
    id: 'product-1',
    name: 'Tea',
    price: 100,
    stock: 10,
  },
  {
    id: 'product-5',
    name: 'Cake',
    price: 50,
    stock: 5,
  },
];

export const createOrderInputMock = {
  userId: userMock.id,
  items: [
    { productId: productsMock[0].id, quantity: 2 },
    { productId: productsMock[1].id, quantity: 1 },
  ],
};

export const orderMock = {
  id: 'order-1',
  userId: userMock.id,
  status: OrderStatus.PENDING,
  total: 250,
  createdAt: new Date('2026-09-19T18:30:00.000Z'),
  items: [
    {
      id: 'order-item-1',
      orderId: 'order-1',
      productId: productsMock[0].id,
      quantity: 2,
      unitPrice: 100,
    },
    {
      id: 'order-item-2',
      orderId: 'order-1',
      productId: productsMock[1].id,
      quantity: 1,
      unitPrice: 50,
    },
  ],
} as Order;
