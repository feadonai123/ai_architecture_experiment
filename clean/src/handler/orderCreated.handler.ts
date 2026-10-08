import { DataSource } from 'typeorm';
import { Event } from '../events/Event';
import { OrderCreatedEvent } from '../events/OrderCreatedEvent';
import { DbManager } from '../manager/db.manager';
import { CreateOrderPayment } from '../usecases/CreateOrderPayment';
import { EventHandler } from '../base/eventHandler.base';

export class OrderCreatedHandler extends EventHandler {
  private readonly dbManager: DbManager;

  constructor(
    dataSource: DataSource,
    private readonly createOrderPayment: CreateOrderPayment,
  ) {
    super('financial');
    this.dbManager = new DbManager(dataSource);
  }

  protected async execute(event: Event<unknown>): Promise<void> {
    if (!(event instanceof OrderCreatedEvent)) {
      throw new Error(`OrderCreatedHandler cannot process ${event.getType()}`);
    }
    const payload = event.getPayload();
    await this.dbManager.startTransaction(() => this.createOrderPayment.run(payload.orderId));
  }
}
