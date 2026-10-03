import {
  processNewEvent,
  processEvents,
  readEvents,
  reconcilePendingEvents,
  retryPendingEvents,
  scheduleRetry,
} from '../../src/consumers/consumerFinancial';
import {
  InvalidOrderCreatedPayloadError,
  InvalidPayloadError,
  OrderNotFoundError,
} from '../../src/errors';
import { EventStream } from '../../src/events/EventStream';
import { EventType } from '../../src/events/EventType';
import { Logger } from '../../src/utils/Logger';
import { mockDataSource } from '../mocks/dataSource';
import { mockOrderPaymentRepo, mockOrderRepo } from '../mocks/order';
import { mockRedis } from '../mocks/redis';

describe('financial consumer', () => {
  describe('success', () => {
    it('handles OrderCreated before acknowledging the stream entry', async () => {
      const redis = mockRedis();
      const order = { id: 'order-1', status: 'PENDING' };
      const orderRepository = mockOrderRepo({ findOne: order });
      const orderPaymentRepository = mockOrderPaymentRepo({ findOne: null });
      const dataSource = mockDataSource({
        order: orderRepository,
        orderPayment: orderPaymentRepository,
      });
      const log = jest.spyOn(Logger, 'info').mockImplementation();
      const payload = {
        orderId: 'order-1',
        userId: 'user-1',
        items: [{ productId: 'product-1', quantity: 2 }],
      };

      await processEvents(dataSource, redis, EventStream.Orders, 'stream-entry-1', [
        'event',
        EventType.OrderCreated,
        'eventId',
        'event-1',
        'timestamp',
        '2026-09-20T12:00:00.000Z',
        'payload',
        JSON.stringify(payload),
      ]);

      expect(log).toHaveBeenCalledWith(`financial consumer handled ${EventType.OrderCreated}`, {
        eventId: 'event-1',
        ...payload,
      });
      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: payload.orderId },
        lock: { mode: 'pessimistic_write' },
      });
      expect(orderPaymentRepository.findOne).toHaveBeenCalledWith({
        where: { orderId: payload.orderId },
      });
      expect(orderPaymentRepository.save).toHaveBeenCalledWith({
        orderId: payload.orderId,
        status: 'PENDING',
        paymentDetails: null,
        paidAt: null,
        createdAt: expect.any(Date),
      });
      expect(orderRepository.save).toHaveBeenCalledWith({
        id: payload.orderId,
        status: 'PAYMENT_PENDING',
      });
      expect(redis.xack).toHaveBeenCalledWith(EventStream.Orders, 'financial', 'stream-entry-1');
      expect(orderRepository.save.mock.invocationCallOrder[0]).toBeLessThan(
        (redis.xack as jest.Mock).mock.invocationCallOrder[0],
      );
      expect(log.mock.invocationCallOrder[0]).toBeLessThan(
        (redis.xack as jest.Mock).mock.invocationCallOrder[0],
      );
      log.mockRestore();
    });

    it('acknowledges an unsupported event without invoking the OrderCreated handler', async () => {
      const redis = mockRedis();
      const dataSource = mockDataSource({});
      const info = jest.spyOn(Logger, 'info').mockImplementation();
      const warn = jest.spyOn(Logger, 'warn').mockImplementation();

      await processEvents(dataSource, redis, EventStream.Orders, 'stream-entry-2', [
        'event',
        'OrderPaid',
        'eventId',
        'event-2',
        'payload',
        '{}',
      ]);

      expect(info).not.toHaveBeenCalled();
      expect(warn).toHaveBeenCalledWith('financial consumer ignored unsupported event', {
        entryId: 'stream-entry-2',
        event: 'OrderPaid',
      });
      expect(redis.xack).toHaveBeenCalledWith(EventStream.Orders, 'financial', 'stream-entry-2');
      expect(dataSource.transaction).not.toHaveBeenCalled();
      info.mockRestore();
      warn.mockRestore();
    });

    it('acknowledges an OrderCreated event when its payment already exists', async () => {
      const redis = mockRedis();
      const log = jest.spyOn(Logger, 'info').mockImplementation();
      const orderRepository = mockOrderRepo({
        findOne: { id: 'order-1', status: 'PAYMENT_PENDING' },
      });
      const orderPaymentRepository = mockOrderPaymentRepo({
        findOne: { orderId: 'order-1', status: 'PENDING' },
      });
      const dataSource = mockDataSource({
        order: orderRepository,
        orderPayment: orderPaymentRepository,
      });

      await processEvents(dataSource, redis, EventStream.Orders, 'stream-entry-duplicate', [
        'event',
        EventType.OrderCreated,
        'eventId',
        'event-duplicate',
        'payload',
        JSON.stringify({
          orderId: 'order-1',
          userId: 'user-1',
          items: [{ productId: 'product-1', quantity: 2 }],
        }),
      ]);

      expect(orderPaymentRepository.save).not.toHaveBeenCalled();
      expect(orderRepository.save).not.toHaveBeenCalled();
      expect(redis.xack).toHaveBeenCalledWith(
        EventStream.Orders,
        'financial',
        'stream-entry-duplicate',
      );
      log.mockRestore();
    });

    it('reads up to ten events from every watched stream', async () => {
      const redis = mockRedis();

      await readEvents(redis, 'financial-consumer-1');

      expect(redis.xreadgroup).toHaveBeenCalledWith(
        'GROUP',
        'financial',
        'financial-consumer-1',
        'COUNT',
        10,
        'BLOCK',
        5000,
        'STREAMS',
        EventStream.Orders,
        '>',
      );
    });

    it('schedules a failed event using the formula in seconds', async () => {
      const redis = mockRedis();
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const random = jest.spyOn(Math, 'random').mockReturnValue(0);

      await scheduleRetry(
        redis,
        EventStream.Orders,
        'pending-entry-1',
        ['eventId', 'pending-event-1'],
        1,
        new Error('temporary failure'),
      );

      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.hset).toHaveBeenCalledWith(
        'financial:retry:event:orders:pending-entry-1',
        {
          eventId: 'pending-event-1',
          entryId: 'pending-entry-1',
          stream: EventStream.Orders,
          deliveryCount: 1,
          lastAttemptAt: 1_000_000,
          nextAttemptAt: 1_015_000,
          idleTimeMs: 15_000,
          lastError: 'Error: temporary failure',
        },
      );
      expect(transaction.zadd).toHaveBeenCalledWith(
        'financial:retry:schedule',
        1_015_000,
        'orders:pending-entry-1',
      );
      now.mockRestore();
      random.mockRestore();
    });

    it('applies the quartic term and bounded random jitter to later attempts', async () => {
      const redis = mockRedis();
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const random = jest.spyOn(Math, 'random').mockReturnValue(0.999);

      await scheduleRetry(
        redis,
        EventStream.Orders,
        'pending-entry-3',
        [],
        3,
        new Error('failure'),
      );

      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.hset).toHaveBeenCalledWith(
        'financial:retry:event:orders:pending-entry-3',
        expect.objectContaining({
          deliveryCount: 3,
          idleTimeMs: 118_000,
          nextAttemptAt: 1_118_000,
        }),
      );
      random.mockRestore();
      now.mockRestore();
    });

    it('claims and processes scheduled pending events', async () => {
      const redis = mockRedis();
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      (redis.zrange as jest.Mock).mockResolvedValueOnce(['orders:pending-entry-1']);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({
        eventId: 'pending-event-1',
        entryId: 'pending-entry-1',
        stream: EventStream.Orders,
        deliveryCount: '1',
        lastAttemptAt: '900000',
        nextAttemptAt: '960000',
        idleTimeMs: '60000',
        lastError: 'temporary failure',
      });
      (redis.xclaim as jest.Mock).mockResolvedValueOnce([
        [
          'pending-entry-1',
          [
            'event',
            EventType.OrderCreated,
            'eventId',
            'pending-event-1',
            'payload',
            JSON.stringify({
              orderId: 'order-1',
              userId: 'user-1',
              items: [{ productId: 'product-1', quantity: 1 }],
            }),
          ],
        ],
      ]);
      const orderRepository = mockOrderRepo({
        findOne: { id: 'order-1', status: 'PENDING' },
      });
      const dataSource = mockDataSource({
        order: orderRepository,
        orderPayment: mockOrderPaymentRepo({ findOne: null }),
      });
      const log = jest.spyOn(Logger, 'info').mockImplementation();

      await retryPendingEvents(dataSource, redis, 'financial-retry-1');

      expect(redis.zrange).toHaveBeenCalledWith(
        'financial:retry:schedule',
        '-inf',
        1_000_000,
        'BYSCORE',
        'LIMIT',
        0,
        10,
      );
      expect(redis.xclaim).toHaveBeenCalledWith(
        EventStream.Orders,
        'financial',
        'financial-retry-1',
        60_000,
        'pending-entry-1',
      );
      expect(orderRepository.save).toHaveBeenCalledWith({
        id: 'order-1',
        status: 'PAYMENT_PENDING',
      });
      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.xack).toHaveBeenCalledWith(
        EventStream.Orders,
        'financial',
        'pending-entry-1',
      );
      expect(transaction.zrem).toHaveBeenCalledWith(
        'financial:retry:schedule',
        'orders:pending-entry-1',
      );
      expect(transaction.del).toHaveBeenCalledWith('financial:retry:event:orders:pending-entry-1');
      log.mockRestore();
      now.mockRestore();
    });

    it('reconciles pending events missing from the retry schedule', async () => {
      const redis = mockRedis();
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const random = jest.spyOn(Math, 'random').mockReturnValue(0);
      (redis.xpending as jest.Mock).mockResolvedValueOnce([
        ['orphan-entry-1', 'old-consumer', 120_000, 2],
      ]);

      await reconcilePendingEvents(redis);

      expect(redis.xpending).toHaveBeenCalledWith(EventStream.Orders, 'financial', '-', '+', 100);
      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.hset).toHaveBeenCalledWith(
        'financial:retry:event:orders:orphan-entry-1',
        expect.objectContaining({
          eventId: 'orphan-entry-1',
          deliveryCount: 2,
          lastAttemptAt: 880_000,
          nextAttemptAt: 896_000,
          idleTimeMs: 16_000,
        }),
      );
      now.mockRestore();
      random.mockRestore();
    });

    it('schedules an already exhausted orphan for immediate dead-letter recovery', async () => {
      const redis = mockRedis();
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      (redis.xpending as jest.Mock).mockResolvedValueOnce([
        ['orphan-entry-exhausted', 'old-consumer', 120_000, 6],
      ]);

      await reconcilePendingEvents(redis);

      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.hset).toHaveBeenCalledWith(
        'financial:retry:event:orders:orphan-entry-exhausted',
        expect.objectContaining({
          deliveryCount: 6,
          idleTimeMs: 0,
          nextAttemptAt: 880_000,
        }),
      );
      now.mockRestore();
    });
  });

  describe('errors', () => {
    it('moves an invalid new event to dead letter before acknowledging it', async () => {
      const redis = mockRedis();
      const fields = [
        'event',
        EventType.OrderCreated,
        'eventId',
        'event-invalid',
        'payload',
        '{invalid-json',
      ];
      const log = jest.spyOn(Logger, 'error').mockImplementation();

      await processNewEvent(mockDataSource({}), redis, EventStream.Orders, 'entry-invalid', fields);

      expect(redis.xadd).toHaveBeenCalledWith(
        'financial:dead-letter',
        '*',
        'sourceStream',
        EventStream.Orders,
        'sourceEntryId',
        'entry-invalid',
        'consumerGroup',
        'financial',
        'event',
        EventType.OrderCreated,
        'eventId',
        'event-invalid',
        'payload',
        '{invalid-json',
        'originalFields',
        JSON.stringify(fields),
        'errorName',
        'InvalidOrderCreatedPayloadError',
        'errorMessage',
        'Invalid OrderCreated payload',
        'failedAt',
        expect.any(String),
      );
      expect(redis.xack).toHaveBeenCalledWith(EventStream.Orders, 'financial', 'entry-invalid');
      expect((redis.xadd as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
        (redis.xack as jest.Mock).mock.invocationCallOrder[0],
      );
      expect(redis.multi).not.toHaveBeenCalled();
      log.mockRestore();
    });

    it('keeps an invalid new event pending if dead-letter publication fails', async () => {
      const redis = mockRedis();
      (redis.xadd as jest.Mock).mockRejectedValueOnce(new Error('dead-letter unavailable'));
      const log = jest.spyOn(Logger, 'error').mockImplementation();

      await processNewEvent(mockDataSource({}), redis, EventStream.Orders, 'entry-invalid', [
        'event',
        EventType.OrderCreated,
        'payload',
        '{invalid-json',
      ]);

      expect(redis.xack).not.toHaveBeenCalled();
      expect(redis.multi).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith(
        'financial consumer failed to move event to dead letter',
        expect.objectContaining({ entryId: 'entry-invalid' }),
      );
      log.mockRestore();
    });

    it('still schedules retry for a new event with a processing error', async () => {
      const redis = mockRedis();
      const dataSource = mockDataSource({
        order: mockOrderRepo({ findOne: null }),
        orderPayment: mockOrderPaymentRepo(),
      });
      const log = jest.spyOn(Logger, 'error').mockImplementation();

      await processNewEvent(dataSource, redis, EventStream.Orders, 'entry-missing-order', [
        'event',
        EventType.OrderCreated,
        'payload',
        JSON.stringify({
          orderId: 'missing-order',
          userId: 'user-1',
          items: [{ productId: 'product-1', quantity: 1 }],
        }),
      ]);

      expect(redis.xadd).not.toHaveBeenCalled();
      expect(redis.xack).not.toHaveBeenCalled();
      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.hset).toHaveBeenCalledWith(
        'financial:retry:event:orders:entry-missing-order',
        expect.objectContaining({
          deliveryCount: 1,
          lastError: 'OrderNotFoundError: Order not found: missing-order',
        }),
      );
      log.mockRestore();
    });

    it('throws InvalidOrderCreatedPayloadError for malformed JSON and does not acknowledge it', async () => {
      const redis = mockRedis();
      const dataSource = mockDataSource({});

      await expect(
        processEvents(dataSource, redis, EventStream.Orders, 'stream-entry-3', [
          'event',
          EventType.OrderCreated,
          'eventId',
          'event-3',
          'payload',
          '{invalid-json',
        ]),
      ).rejects.toBeInstanceOf(InvalidOrderCreatedPayloadError);

      expect(new InvalidOrderCreatedPayloadError()).toBeInstanceOf(InvalidPayloadError);

      expect(redis.xack).not.toHaveBeenCalled();
    });

    it('throws InvalidOrderCreatedPayloadError for an invalid payload structure', async () => {
      const redis = mockRedis();
      const dataSource = mockDataSource({});

      await expect(
        processEvents(dataSource, redis, EventStream.Orders, 'stream-entry-4', [
          'event',
          EventType.OrderCreated,
          'eventId',
          'event-4',
          'payload',
          '{}',
        ]),
      ).rejects.toBeInstanceOf(InvalidOrderCreatedPayloadError);

      expect(redis.xack).not.toHaveBeenCalled();
    });

    it('throws OrderNotFoundError and does not acknowledge the event', async () => {
      const redis = mockRedis();
      const orderPaymentRepository = mockOrderPaymentRepo();
      const dataSource = mockDataSource({
        order: mockOrderRepo({ findOne: null }),
        orderPayment: orderPaymentRepository,
      });

      await expect(
        processEvents(dataSource, redis, EventStream.Orders, 'stream-entry-5', [
          'event',
          EventType.OrderCreated,
          'eventId',
          'event-5',
          'payload',
          JSON.stringify({
            orderId: 'missing-order',
            userId: 'user-1',
            items: [{ productId: 'product-1', quantity: 1 }],
          }),
        ]),
      ).rejects.toBeInstanceOf(OrderNotFoundError);

      expect(orderPaymentRepository.findOne).not.toHaveBeenCalled();
      expect(redis.xack).not.toHaveBeenCalled();
    });

    it('moves an invalid retried event to dead letter and clears its retry state', async () => {
      const redis = mockRedis();
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      (redis.zrange as jest.Mock).mockResolvedValueOnce(['orders:pending-entry-error']);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({
        eventId: 'pending-event-error',
        entryId: 'pending-entry-error',
        stream: EventStream.Orders,
        deliveryCount: '1',
        lastAttemptAt: '900000',
        nextAttemptAt: '960000',
        idleTimeMs: '60000',
        lastError: 'temporary failure',
      });
      (redis.xclaim as jest.Mock).mockResolvedValueOnce([
        [
          'pending-entry-error',
          [
            'event',
            EventType.OrderCreated,
            'eventId',
            'pending-event-error',
            'payload',
            '{invalid-json',
          ],
        ],
      ]);
      const dataSource = mockDataSource({});
      const log = jest.spyOn(Logger, 'error').mockImplementation();

      await retryPendingEvents(dataSource, redis, 'financial-retry-1');

      expect(log).toHaveBeenCalledWith('financial consumer failed to retry pending event', {
        entryId: 'pending-entry-error',
        deliveryCount: 2,
        error: expect.any(InvalidOrderCreatedPayloadError),
      });
      expect(redis.xadd).toHaveBeenCalledTimes(1);
      expect((redis.xadd as jest.Mock).mock.calls[0][0]).toBe('financial:dead-letter');
      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.zadd).toHaveBeenCalledWith(
        'financial:retry:schedule',
        1_060_000,
        'orders:pending-entry-error',
      );
      expect(transaction.zadd).toHaveBeenCalledTimes(1);
      expect(transaction.xack).toHaveBeenCalledWith(
        EventStream.Orders,
        'financial',
        'pending-entry-error',
      );
      expect(transaction.zrem).toHaveBeenCalledWith(
        'financial:retry:schedule',
        'orders:pending-entry-error',
      );
      expect(transaction.del).toHaveBeenCalledWith(
        'financial:retry:event:orders:pending-entry-error',
      );
      expect((redis.xadd as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
        transaction.xack.mock.invocationCallOrder[0],
      );
      log.mockRestore();
      now.mockRestore();
    });

    it('keeps an invalid retried event pending when dead-letter publication fails', async () => {
      const redis = mockRedis();
      (redis.zrange as jest.Mock).mockResolvedValueOnce(['orders:pending-entry-error']);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({
        eventId: 'pending-event-error',
        entryId: 'pending-entry-error',
        stream: EventStream.Orders,
        deliveryCount: '1',
        lastAttemptAt: '900000',
        nextAttemptAt: '960000',
        idleTimeMs: '60000',
        lastError: 'temporary failure',
      });
      (redis.xclaim as jest.Mock).mockResolvedValueOnce([
        ['pending-entry-error', ['event', EventType.OrderCreated, 'payload', '{invalid-json']],
      ]);
      (redis.xadd as jest.Mock).mockRejectedValueOnce(new Error('dead-letter unavailable'));
      const log = jest.spyOn(Logger, 'error').mockImplementation();

      await retryPendingEvents(mockDataSource({}), redis, 'financial-retry-1');

      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.xack).not.toHaveBeenCalled();
      expect(transaction.zrem).not.toHaveBeenCalled();
      expect(transaction.del).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith(
        'financial consumer failed to move retried event to dead letter',
        expect.objectContaining({ entryId: 'pending-entry-error' }),
      );
      log.mockRestore();
    });

    it('continues retrying a pending event when processing fails for another reason', async () => {
      const redis = mockRedis();
      const now = jest.spyOn(Date, 'now').mockReturnValue(1_000_000);
      const random = jest.spyOn(Math, 'random').mockReturnValue(0);
      (redis.zrange as jest.Mock).mockResolvedValueOnce(['orders:pending-entry-error']);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({
        eventId: 'pending-event-error',
        entryId: 'pending-entry-error',
        stream: EventStream.Orders,
        deliveryCount: '1',
        lastAttemptAt: '900000',
        nextAttemptAt: '960000',
        idleTimeMs: '60000',
        lastError: 'temporary failure',
      });
      (redis.xclaim as jest.Mock).mockResolvedValueOnce([
        [
          'pending-entry-error',
          [
            'event',
            EventType.OrderCreated,
            'payload',
            JSON.stringify({
              orderId: 'missing-order',
              userId: 'user-1',
              items: [{ productId: 'product-1', quantity: 1 }],
            }),
          ],
        ],
      ]);
      const dataSource = mockDataSource({
        order: mockOrderRepo({ findOne: null }),
        orderPayment: mockOrderPaymentRepo(),
      });
      const log = jest.spyOn(Logger, 'error').mockImplementation();

      await retryPendingEvents(dataSource, redis, 'financial-retry-1');

      expect(redis.xadd).not.toHaveBeenCalled();
      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.xack).not.toHaveBeenCalled();
      expect(transaction.zadd).toHaveBeenLastCalledWith(
        'financial:retry:schedule',
        1_016_000,
        'orders:pending-entry-error',
      );
      log.mockRestore();
      now.mockRestore();
      random.mockRestore();
    });

    it('moves an event to dead letter when its sixth attempt fails', async () => {
      const redis = mockRedis();
      (redis.zrange as jest.Mock).mockResolvedValueOnce(['orders:pending-entry-exhausted']);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({
        eventId: 'event-exhausted',
        entryId: 'pending-entry-exhausted',
        stream: EventStream.Orders,
        deliveryCount: '5',
        lastAttemptAt: '900000',
        nextAttemptAt: '960000',
        idleTimeMs: '60000',
        lastError: 'earlier failure',
      });
      (redis.xclaim as jest.Mock).mockResolvedValueOnce([
        [
          'pending-entry-exhausted',
          [
            'event',
            EventType.OrderCreated,
            'payload',
            JSON.stringify({
              orderId: 'missing-order',
              userId: 'user-1',
              items: [{ productId: 'product-1', quantity: 1 }],
            }),
          ],
        ],
      ]);
      const dataSource = mockDataSource({
        order: mockOrderRepo({ findOne: null }),
        orderPayment: mockOrderPaymentRepo(),
      });
      const log = jest.spyOn(Logger, 'error').mockImplementation();

      await retryPendingEvents(dataSource, redis, 'financial-retry-1');

      expect(dataSource.transaction).toHaveBeenCalledTimes(1);
      expect(redis.xadd).toHaveBeenCalledTimes(1);
      const call = (redis.xadd as jest.Mock).mock.calls[0] as string[];
      expect(call[0]).toBe('financial:dead-letter');
      expect(call[call.indexOf('errorName') + 1]).toBe('RetryAttemptsExhaustedError');
      expect(call[call.indexOf('errorMessage') + 1]).toContain('6 attempts');
      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.xack).toHaveBeenCalledWith(
        EventStream.Orders,
        'financial',
        'pending-entry-exhausted',
      );
      expect(transaction.zrem).toHaveBeenCalledWith(
        'financial:retry:schedule',
        'orders:pending-entry-exhausted',
      );
      expect(transaction.del).toHaveBeenCalledWith(
        'financial:retry:event:orders:pending-entry-exhausted',
      );
      expect(transaction.zadd).toHaveBeenCalledTimes(1);
      log.mockRestore();
    });

    it('sends an already exhausted pending event to dead letter without another handler call', async () => {
      const redis = mockRedis();
      (redis.zrange as jest.Mock).mockResolvedValueOnce(['orders:pending-entry-exhausted']);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({
        eventId: 'event-exhausted',
        entryId: 'pending-entry-exhausted',
        stream: EventStream.Orders,
        deliveryCount: '6',
        lastAttemptAt: '900000',
        nextAttemptAt: '960000',
        idleTimeMs: '60000',
        lastError: 'OrderNotFoundError: Order not found: missing-order',
      });
      (redis.xclaim as jest.Mock).mockResolvedValueOnce([
        ['pending-entry-exhausted', ['event', EventType.OrderCreated, 'payload', '{}']],
      ]);
      const dataSource = mockDataSource({});

      await retryPendingEvents(dataSource, redis, 'financial-retry-1');

      expect(dataSource.transaction).not.toHaveBeenCalled();
      expect(redis.xadd).toHaveBeenCalledTimes(1);
      const call = (redis.xadd as jest.Mock).mock.calls[0] as string[];
      expect(call[call.indexOf('errorName') + 1]).toBe('RetryAttemptsExhaustedError');
      expect(call[call.indexOf('errorMessage') + 1]).toContain('6 attempts');
      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.xack).toHaveBeenCalledWith(
        EventStream.Orders,
        'financial',
        'pending-entry-exhausted',
      );
    });

    it('keeps an exhausted event pending when dead-letter publication fails', async () => {
      const redis = mockRedis();
      (redis.zrange as jest.Mock).mockResolvedValueOnce(['orders:pending-entry-exhausted']);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({
        eventId: 'event-exhausted',
        entryId: 'pending-entry-exhausted',
        stream: EventStream.Orders,
        deliveryCount: '6',
        lastAttemptAt: '900000',
        nextAttemptAt: '960000',
        idleTimeMs: '60000',
        lastError: 'OrderNotFoundError: Order not found: missing-order',
      });
      (redis.xclaim as jest.Mock).mockResolvedValueOnce([
        ['pending-entry-exhausted', ['event', EventType.OrderCreated, 'payload', '{}']],
      ]);
      (redis.xadd as jest.Mock).mockRejectedValueOnce(new Error('dead-letter unavailable'));
      const log = jest.spyOn(Logger, 'error').mockImplementation();

      await retryPendingEvents(mockDataSource({}), redis, 'financial-retry-1');

      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.xack).not.toHaveBeenCalled();
      expect(transaction.zrem).not.toHaveBeenCalled();
      expect(transaction.del).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith(
        'financial consumer failed to move exhausted event to dead letter',
        expect.objectContaining({ entryId: 'pending-entry-exhausted' }),
      );
      log.mockRestore();
    });
  });
});
