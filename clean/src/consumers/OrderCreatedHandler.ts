import { DataSource } from 'typeorm';
import { Event } from '../events/Event';
import { OrderCreatedEvent } from '../events/OrderCreatedEvent';
import { DbManager } from '../manager/db.manager';
import { ProcessOrderCreated } from '../usecases/ProcessOrderCreated';
import { EventHandler } from './EventHandler';

export class OrderCreatedHandler implements EventHandler {
  private readonly dbManager: DbManager;

  constructor(
    dataSource: DataSource,
    private readonly processOrderCreated: ProcessOrderCreated,
  ) {
    this.dbManager = new DbManager(dataSource);
  }

  async handle(event: Event<unknown>): Promise<void> {
    if (!(event instanceof OrderCreatedEvent)) {
      throw new Error(`OrderCreatedHandler cannot process ${event.getType()}`);
    }
    await this.dbManager.startTransaction(() => this.processOrderCreated.run(event));
  }
}
