import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { OrderRecord } from './order.record';
import { ProductRecord } from './product.record';

const numericTransformer = {
  to: (value: number) => value,
  from: (value: string | number) => Number(value),
};

@Entity({ name: 'order_items' })
export class OrderItemRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column('int')
  quantity!: number;

  @Column({
    name: 'unit_price',
    type: 'numeric',
    precision: 10,
    scale: 2,
    transformer: numericTransformer,
  })
  unitPrice!: number;

  @ManyToOne(() => OrderRecord, (order) => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order!: OrderRecord;

  @ManyToOne(() => ProductRecord)
  @JoinColumn({ name: 'product_id' })
  product!: ProductRecord;
}
