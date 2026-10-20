import { DataSource } from 'typeorm';
import { EventHandler } from '../base/eventHandler.base';
import { Event } from '../events/Event';
import { PaymentDeclinedErrorEvent } from '../events/PaymentDeclinedErrorEvent';
import { InvalidPaymentDeclinedPayloadError } from '../errors/InvalidPaymentDeclinedPayloadError';
import { DbManager } from '../manager/db.manager';
import { CancelOrderPayment } from '../usecases/CancelOrderPayment';

export class PaymentDeclinedHandler extends EventHandler {
  private readonly dbManager: DbManager;
  constructor(
    dataSource: DataSource,
    private readonly useCase: CancelOrderPayment,
  ) {
    super('order');
    this.dbManager = new DbManager(dataSource);
  }
  protected async execute(event: Event<unknown>): Promise<void> {
    if (!(event instanceof PaymentDeclinedErrorEvent))
      throw new InvalidPaymentDeclinedPayloadError();
    const payload = event.getPayload();
    await this.dbManager.startTransaction(() => this.useCase.run(payload.orderId));
  }
}
