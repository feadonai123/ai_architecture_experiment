import { getDataSource } from '../database';
import { User as UserEntity } from '../entities/User';

export class User {
  static findById(id: string): Promise<UserEntity | null> {
    return getDataSource().getRepository(UserEntity).findOne({ where: { id } });
  }
}
