import { Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'users' })
export class UserRecord {
  @PrimaryColumn('uuid')
  id!: string;
}
