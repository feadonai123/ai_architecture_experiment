export class EventStream {
  static readonly Orders = 'orders';
  static readonly Payments = 'payments';
  static readonly All = [EventStream.Orders, EventStream.Payments] as const;

  private constructor() {}
}

export type EventStreamName = (typeof EventStream.All)[number];
