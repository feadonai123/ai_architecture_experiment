import type { Request, RequestHandler, Response } from 'express';
import { DataSource } from 'typeorm';
import { DbManager } from '../../manager/db.manager';
import { Logger } from '../../utils/Logger';

export abstract class RouterBase {
  private readonly dbManager: DbManager;

  constructor(protected readonly dataSource: DataSource) {
    this.dbManager = new DbManager(dataSource);
  }

  abstract handle(request: Request, response: Response): Promise<void>;

  asHandler(): RequestHandler {
    return async (request, response, next) => {
      Logger.info(`${this.constructor.name} transaction started`);
      try {
        await this.dbManager.startTransaction(async () => {
          await this.handle(request, response);
        });
        Logger.info(`${this.constructor.name} transaction committed`);
      } catch (error) {
        Logger.error(`${this.constructor.name} transaction rolled back`, error);
        next(error);
      }
    };
  }
}
