import { DataSource } from 'typeorm';
import { DbManager } from '../../../manager/db.manager';
import { UserRecord } from '../../../shared/database/UserRecord';

export class UserRepository {
  constructor(private readonly dataSource: DataSource) {}

  async exists(id: string): Promise<boolean> {
    return DbManager.getManager(this.dataSource).getRepository(UserRecord).exists({ where: { id } });
  }
}
