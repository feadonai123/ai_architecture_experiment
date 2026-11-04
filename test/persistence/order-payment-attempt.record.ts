import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrderRecord } from './order.record';

@Entity({ name: 'order_payment_attempts' })
export class OrderPaymentAttemptRecord {
  @PrimaryColumn({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @PrimaryColumn({ name: 'idempotency_key', type: 'uuid' })
  idempotencyKey!: string;

  @Column({ name: 'attempt_number', type: 'smallint' })
  attemptNumber!: number;

  @Column({ type: 'varchar', length: 32 })
  token!: string;

  @Column({ type: 'smallint' })
  status!: number;

  @Column({ name: 'payment_details', type: 'jsonb', nullable: true })
  paymentDetails!: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @ManyToOne(() => OrderRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderRecord;
}
