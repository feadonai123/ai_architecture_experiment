import { Column, Entity, PrimaryColumn } from 'typeorm';
import { OrderPaymentStatus } from '../entities/OrderPaymentStatus';
import { PaymentToken } from '../entities/PaymentToken';

@Entity({ name: 'order_payment_attempts' })
export class OrderPaymentAttemptRecord {
  @PrimaryColumn('uuid', { name: 'order_id' }) orderId!: string;
  @PrimaryColumn('uuid', { name: 'idempotency_key' }) idempotencyKey!: string;
  @Column({ name: 'attempt_number', type: 'smallint' }) attemptNumber!: number;
  @Column({ name: 'payment_token', type: 'varchar', length: 20 }) paymentToken!: PaymentToken;
  @Column({ type: 'smallint' }) status!: OrderPaymentStatus;
  @Column({ name: 'payment_details', type: 'jsonb', nullable: true }) paymentDetails!: Record<
    string,
    unknown
  > | null;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt!: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
