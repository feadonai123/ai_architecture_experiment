import { Column, Entity, JoinColumn, ManyToOne, OneToMany, OneToOne, PrimaryColumn } from 'typeorm';
import { OrderStatus } from '../enums/OrderStatus';
import { OrderItem } from './OrderItem';
import { OrderPayment } from './OrderPayment';
import { User } from './User';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity({ name: 'orders' })
export class Order {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'user_id', type: 'uuid' })
  userId!: string;

  @Column({ type: 'smallint' })
  status!: OrderStatus;

  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  total!: number;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user!: User;

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];

  @OneToOne(() => OrderPayment, (payment) => payment.order)
  payment!: OrderPayment;
}
