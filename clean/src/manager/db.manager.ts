import { AsyncLocalStorage } from 'node:async_hooks';
import { DataSource, EntityManager } from 'typeorm';

export class DbManager {
  private static readonly storage = new AsyncLocalStorage<{
    manager: EntityManager;
    afterCommit: Array<() => Promise<void>>;
  }>();

  constructor(private readonly dataSource: DataSource) {}

  static getManager(dataSource: DataSource): EntityManager {
    return DbManager.storage.getStore()?.manager ?? dataSource.manager;
  }

  static registerAfterCommit(action: () => Promise<void>): void {
    const transaction = DbManager.storage.getStore();
    if (!transaction) throw new Error('Publication requires an active transaction');
    transaction.afterCommit.push(action);
  }

  async startTransaction<T>(work: (manager: EntityManager) => Promise<T>): Promise<T> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const context = {
        manager: queryRunner.manager,
        afterCommit: [] as Array<() => Promise<void>>,
      };
      const result = await DbManager.storage.run(context, () => work(queryRunner.manager));
      await queryRunner.commitTransaction();
      for (const action of context.afterCommit) await action();
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
