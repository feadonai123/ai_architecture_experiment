import { Column, Entity, JoinColumn, OneToOne, PrimaryColumn } from 'typeorm';
import { OrderRecord } from './order.record';

@Entity({ name: 'order_payments' })
export class OrderPaymentRecord {
  @PrimaryColumn({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ type: 'smallint' })
  status!: number;

  @Column({ name: 'payment_details', type: 'jsonb', nullable: true })
  paymentDetails!: Record<string, unknown> | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToOne(() => OrderRecord, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderRecord;
}
