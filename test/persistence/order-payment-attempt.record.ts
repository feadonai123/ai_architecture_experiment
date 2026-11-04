import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrderRecord } from './order.record';

@Entity({ name: 'order_payment_attempts' })
export class OrderPaymentAttemptRecord {
  @PrimaryColumn({ name: 'order_id', type: 'uuid' }) orderId!: string;
  @PrimaryColumn({ name: 'attempt_number', type: 'smallint' }) attemptNumber!: number;
  @Column({ name: 'idempotency_key', type: 'uuid' }) idempotencyKey!: string;
  @Column({ name: 'payment_token', type: 'varchar', length: 20 }) paymentToken!: string;
  @Column({ type: 'smallint' }) status!: number;
  @Column({ name: 'payment_details', type: 'jsonb', nullable: true }) paymentDetails!: Record<
    string,
    unknown
  > | null;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt!: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;

  @ManyToOne(() => OrderRecord)
  @JoinColumn({ name: 'order_id' })
  order!: OrderRecord;
}
