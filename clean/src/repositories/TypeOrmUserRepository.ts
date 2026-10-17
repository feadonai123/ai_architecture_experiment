import { DataSource } from 'typeorm';
import { UserRecord } from '../infrastructure/typeorm/UserRecord';
import { DbManager } from '../manager/db.manager';
import { UserRepository } from '../ports/UserRepository';

export class TypeOrmUserRepository implements UserRepository {
  constructor(private readonly dataSource: DataSource) {}
  async exists(id: string): Promise<boolean> {
    return DbManager.getManager(this.dataSource)
      .getRepository(UserRecord)
      .exists({ where: { id } });
  }
}
