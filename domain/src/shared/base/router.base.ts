import type { Request, RequestHandler, Response } from 'express';
import { DataSource } from 'typeorm';
import { DbManager } from '../../manager/db.manager';
import { Logger } from '../../utils/Logger';

export type RouteResponse = { statusCode: number; body: unknown };

export abstract class RouterBase {
  private readonly dbManager: DbManager;

  constructor(protected readonly dataSource: DataSource) {
    this.dbManager = new DbManager(dataSource);
  }

  abstract handle(request: Request, response: Response): Promise<void | RouteResponse>;

  asHandler(): RequestHandler {
    return async (request, response, next) => {
      Logger.info(`${this.constructor.name} transaction started`);
      try {
        const result = await this.dbManager.startTransaction(() => this.handle(request, response));
        Logger.info(`${this.constructor.name} transaction committed`);
        if (result) response.status(result.statusCode).json(result.body);
      } catch (error) {
        Logger.error(`${this.constructor.name} request failed`, error);
        next(error);
      }
    };
  }
}
