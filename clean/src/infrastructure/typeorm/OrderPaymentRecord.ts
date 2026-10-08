import { Column, Entity, PrimaryColumn } from 'typeorm';
import { OrderPaymentStatus } from '../../entities/OrderPaymentStatus';

@Entity({ name: 'order_payments' })
export class OrderPaymentRecord {
  @PrimaryColumn('uuid', { name: 'order_id' }) orderId!: string;
  @Column({ type: 'smallint', default: OrderPaymentStatus.PENDING }) status!: OrderPaymentStatus;
  @Column({ name: 'payment_details', type: 'jsonb', nullable: true }) paymentDetails!: Record<
    string,
    unknown
  > | null;
  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true }) paidAt!: Date | null;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
