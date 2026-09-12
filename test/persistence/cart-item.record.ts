import { Column, Entity, JoinColumn, ManyToOne, PrimaryColumn, Unique } from 'typeorm';
import { CartRecord } from './cart.record';
import { ProductRecord } from './product.record';

@Entity({ name: 'cart_items' })
@Unique(['cartId', 'productId'])
export class CartItemRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'cart_id', type: 'uuid' })
  cartId!: string;

  @Column({ name: 'product_id', type: 'uuid' })
  productId!: string;

  @Column('int')
  quantity!: number;

  @ManyToOne(() => CartRecord, (cart) => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart!: CartRecord;

  @ManyToOne(() => ProductRecord)
  @JoinColumn({ name: 'product_id' })
  product!: ProductRecord;
}
