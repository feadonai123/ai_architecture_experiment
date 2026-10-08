import { DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { UserRecord } from '../persistence/user.record';

type UserOverrides = Partial<Pick<UserRecord, 'id'>>;

export class UserPrefab {
  static async create(dataSource: DataSource, overrides: UserOverrides = {}): Promise<UserRecord> {
    const repository = dataSource.getRepository(UserRecord);
    return repository.save(repository.create({ id: overrides.id ?? uuidv4() }));
  }
}
