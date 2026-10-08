import { Column, Entity, PrimaryColumn } from 'typeorm';
import { OrderStatus } from '../../entities/OrderStatus';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity({ name: 'orders' })
export class OrderRecord {
  @PrimaryColumn('uuid') id!: string;
  @Column({ name: 'user_id', type: 'uuid' }) userId!: string;
  @Column({ type: 'smallint' }) status!: OrderStatus;
  @Column({ type: 'numeric', precision: 10, scale: 2, transformer: numericTransformer })
  total!: number;
  @Column({ name: 'created_at', type: 'timestamptz' }) createdAt!: Date;
}
