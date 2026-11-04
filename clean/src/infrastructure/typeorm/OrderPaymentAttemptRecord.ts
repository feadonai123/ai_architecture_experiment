import { Column, Entity, PrimaryColumn, Unique } from 'typeorm';
import { OrderPaymentStatus } from '../../entities/OrderPaymentStatus';
import { PaymentToken } from '../../entities/PaymentToken';

@Entity({ name: 'order_payment_attempts' })
@Unique('order_payment_attempts_order_idempotency_key_unique', ['orderId', 'idempotencyKey'])
export class OrderPaymentAttemptRecord {
  @PrimaryColumn({ name: 'order_id', type: 'uuid' }) orderId!: string;
  @PrimaryColumn({ name: 'attempt_number', type: 'smallint' }) attemptNumber!: number;
  @Column({ name: 'idempotency_key', type: 'uuid' }) idempotencyKey!: string;
  @Column({ name: 'payment_token', type: 'varchar', length: 20 }) paymentToken!: PaymentToken;
  @Column({ type: 'smallint' }) status!: OrderPaymentStatus;
  @Column({ name: 'payment_details', type: 'jsonb', nullable: true }) paymentDetails!: Record<
    string,
    unknown
  > | null;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt!: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
