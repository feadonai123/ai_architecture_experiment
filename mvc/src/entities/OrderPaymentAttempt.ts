import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrderPaymentStatus } from '../enums/OrderPaymentStatus';
import { Order } from './Order';

@Entity({ name: 'order_payment_attempts' })
export class OrderPaymentAttempt {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'attempt_number', type: 'smallint' })
  attemptNumber!: number;

  @Column({ name: 'idempotency_key', type: 'uuid' })
  idempotencyKey!: string;

  @Column({ name: 'payment_token', type: 'varchar', length: 32 })
  paymentToken!: string;

  @Column({ type: 'smallint' })
  status!: OrderPaymentStatus;

  @Column({ name: 'payment_details', type: 'jsonb' })
  paymentDetails!: Record<string, unknown>;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;
}
