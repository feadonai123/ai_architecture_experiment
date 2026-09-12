import { AsyncLocalStorage } from 'node:async_hooks';
import { DataSource, EntityManager } from 'typeorm';

export class DbManager {
  private static readonly storage = new AsyncLocalStorage<EntityManager>();

  constructor(private readonly dataSource: DataSource) {}

  static getManager(dataSource: DataSource): EntityManager {
    return DbManager.storage.getStore() ?? dataSource.manager;
  }

  async startTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const result = await DbManager.storage.run(queryRunner.manager, () =>
        work(queryRunner.manager),
      );
      await queryRunner.commitTransaction();
      return result;
    } catch (error) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
