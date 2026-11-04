import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrderPaymentStatus } from '../enums/OrderPaymentStatus';
import { PaymentToken } from '../enums/PaymentToken';
import { Order } from './Order';

@Entity({ name: 'order_payment_attempts' })
export class OrderPaymentAttempt {
  @PrimaryColumn('uuid', { name: 'order_id' })
  orderId!: string;

  @PrimaryColumn('uuid', { name: 'idempotency_key' })
  idempotencyKey!: string;

  @Column({ name: 'attempt_number', type: 'smallint' })
  attemptNumber!: number;

  @Column({ type: 'varchar', length: 32 })
  token!: PaymentToken;

  @Column({ type: 'smallint' })
  status!: OrderPaymentStatus;

  @Column({ name: 'payment_details', type: 'jsonb', nullable: true })
  paymentDetails!: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => Order, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: Order;
}
