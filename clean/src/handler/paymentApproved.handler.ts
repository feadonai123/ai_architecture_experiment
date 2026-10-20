import { DataSource } from 'typeorm';
import { EventHandler } from '../base/eventHandler.base';
import { Event } from '../events/Event';
import { PaymentApprovedEvent } from '../events/PaymentApprovedEvent';
import { InvalidPaymentApprovedPayloadError } from '../errors/InvalidPaymentApprovedPayloadError';
import { DbManager } from '../manager/db.manager';
import { ApproveOrderPayment } from '../usecases/ApproveOrderPayment';

export class PaymentApprovedHandler extends EventHandler {
  private readonly dbManager: DbManager;
  constructor(
    dataSource: DataSource,
    private readonly useCase: ApproveOrderPayment,
  ) {
    super('order');
    this.dbManager = new DbManager(dataSource);
  }
  protected async execute(event: Event<unknown>): Promise<void> {
    if (!(event instanceof PaymentApprovedEvent)) throw new InvalidPaymentApprovedPayloadError();
    const payload = event.getPayload();
    await this.dbManager.startTransaction(() => this.useCase.run(payload.orderId));
  }
}
