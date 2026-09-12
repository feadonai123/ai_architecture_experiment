import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { CartItemRecord } from './cart-item.record';

@Entity({ name: 'carts' })
export class CartRecord {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => CartItemRecord, (item) => item.cart)
  items!: CartItemRecord[];
}
