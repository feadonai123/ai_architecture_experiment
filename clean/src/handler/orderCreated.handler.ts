import { DataSource } from 'typeorm';
import { Event } from '../events/Event';
import { OrderCreatedEvent } from '../events/OrderCreatedEvent';
import { DbManager } from '../manager/db.manager';
import { ProcessOrderCreated } from '../usecases/ProcessOrderCreated';
import { EventHandler } from '../base/eventHandler.base';

export class OrderCreatedHandler extends EventHandler {
  private readonly dbManager: DbManager;

  constructor(
    dataSource: DataSource,
    private readonly processOrderCreated: ProcessOrderCreated,
  ) {
    super('financial');
    this.dbManager = new DbManager(dataSource);
  }

  protected async execute(event: Event<unknown>): Promise<void> {
    if (!(event instanceof OrderCreatedEvent)) {
      throw new Error(`OrderCreatedHandler cannot process ${event.getType()}`);
    }
    const payload = event.getPayload();
    await this.dbManager.startTransaction(() => this.processOrderCreated.run(payload.orderId));
  }
}
