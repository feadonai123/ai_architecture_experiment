import { OrderItem } from './OrderItem';
import { OrderStatus } from './OrderStatus';

export class Order {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public status: OrderStatus,
    public readonly total: number,
    public readonly createdAt: Date,
    public items: OrderItem[],
  ) {}
}
