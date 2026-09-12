import { Column, Entity, OneToMany, PrimaryColumn } from 'typeorm';
import { CartItem } from './CartItem';

@Entity({ name: 'carts' })
export class Cart {
  @PrimaryColumn('uuid')
  id!: string;

  @Column({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @OneToMany(() => CartItem, (item) => item.cart)
  items!: CartItem[];
}
