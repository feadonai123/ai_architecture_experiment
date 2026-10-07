import { ConsumerFinancial } from '../../src/consumers/ConsumerFinancial';
import { setDataSource } from '../../src/database';
import { Order as OrderEntity } from '../../src/entities/Order';
import { OrderPaymentStatus } from '../../src/enums/OrderPaymentStatus';
import { OrderStatus } from '../../src/enums/OrderStatus';
import { InvalidOrderCreatedPayloadError } from '../../src/errors/InvalidOrderCreatedPayloadError';
import { EventStream } from '../../src/events/EventStream';
import { Order } from '../../src/models/Order';
import { OrderPayment } from '../../src/models/OrderPayment';
import { Logger } from '../../src/utils/Logger';
import { mockConsumerConfig, mockConsumerRedis } from '../mocks/consumer';

const fields = [
  'event',
  'OrderCreated',
  'eventId',
  'order-1',
  'payload',
  JSON.stringify({ orderId: 'order-1', userId: 'user-1', items: [] }),
];

describe('financial consumer', () => {
  afterEach(() => jest.restoreAllMocks());

  describe('success', () => {
    it('creates payment and changes order status in one transaction', async () => {
      const order = { id: 'order-1', status: OrderStatus.PENDING };
      const orderRepository = {
        findOne: jest.fn().mockResolvedValue(order),
        save: jest.fn().mockResolvedValue(order),
      };
      const paymentRepository = {
        findOne: jest.fn().mockResolvedValue(null),
        create: jest.fn((value) => value),
        save: jest.fn().mockImplementation(async (value) => value),
      };
      const transaction = jest.fn(async (run) =>
        run({
          getRepository: (entity: unknown) =>
            entity === OrderEntity ? orderRepository : paymentRepository,
        }),
      );
      setDataSource({ transaction } as never);
      const redis = mockConsumerRedis();
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.processNewEvent(EventStream.Orders, 'stream-transaction', fields, redis);

      expect(transaction).toHaveBeenCalledTimes(1);
      expect(orderRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'order-1' },
        lock: { mode: 'pessimistic_write' },
      });
      expect(paymentRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          orderId: 'order-1',
          status: OrderPaymentStatus.PENDING,
          paymentDetails: null,
          paidAt: null,
        }),
      );
      expect(orderRepository.save).toHaveBeenCalledWith({
        id: 'order-1',
        status: OrderStatus.PAYMENT_PENDING,
      });
      expect(redis.xack).toHaveBeenCalledWith('orders', 'financial', 'stream-transaction');
    });

    it('does not create another payment on duplicate delivery', async () => {
      const orderRepository = {
        findOne: jest.fn().mockResolvedValue({ id: 'order-1', status: OrderStatus.PAYMENT_PENDING }),
        save: jest.fn(),
      };
      const paymentRepository = {
        findOne: jest.fn().mockResolvedValue({ orderId: 'order-1', status: OrderPaymentStatus.PENDING }),
        save: jest.fn(),
      };
      setDataSource({
        transaction: jest.fn(async (run) =>
          run({
            getRepository: (entity: unknown) =>
              entity === OrderEntity ? orderRepository : paymentRepository,
          }),
        ),
      } as never);
      const redis = mockConsumerRedis();
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.processNewEvent(EventStream.Orders, 'stream-duplicate', fields, redis);

      expect(paymentRepository.save).not.toHaveBeenCalled();
      expect(orderRepository.save).not.toHaveBeenCalled();
      expect(redis.xack).toHaveBeenCalled();
    });

    it('acknowledges OrderCreated only after its payment is committed', async () => {
      const redis = mockConsumerRedis();
      const steps: string[] = [];
      setDataSource({
        transaction: jest.fn(async (run) => {
          await run({});
          steps.push('commit');
        }),
      } as never);
      jest
        .spyOn(Order, 'findByIdForUpdate')
        .mockResolvedValue({ id: 'order-1', status: OrderStatus.PENDING } as OrderEntity);
      jest.spyOn(OrderPayment, 'findByOrderId').mockResolvedValue(null);
      jest.spyOn(OrderPayment, 'create').mockResolvedValue({ orderId: 'order-1' } as never);
      jest.spyOn(Order, 'update').mockResolvedValue({ id: 'order-1' } as OrderEntity);
      (redis.xack as jest.Mock).mockImplementation(async () => {
        steps.push('ack');
        return 1;
      });
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.processNewEvent(EventStream.Orders, 'stream-1', fields, redis);

      expect(redis.xack).toHaveBeenCalledWith('orders', 'financial', 'stream-1');
      expect(steps).toEqual(['commit', 'ack']);
    });

    it('acknowledges an unsupported event without calling the handler', async () => {
      const redis = mockConsumerRedis();
      const handle = jest.spyOn(OrderPayment, 'create');
      const info = jest.spyOn(Logger, 'info').mockImplementation();
      const warn = jest.spyOn(Logger, 'warn').mockImplementation();
      const error = jest.spyOn(Logger, 'error').mockImplementation();
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.processNewEvent(EventStream.Orders, 'stream-2', ['event', 'Unknown'], redis);

      expect(handle).not.toHaveBeenCalled();
      expect(redis.xack).toHaveBeenCalledWith('orders', 'financial', 'stream-2');
      expect(info).not.toHaveBeenCalled();
      expect(warn).not.toHaveBeenCalled();
      expect(error).not.toHaveBeenCalled();
    });
  });

  describe('errors', () => {
    it('does not create a payment or acknowledge when the order is missing', async () => {
      const redis = mockConsumerRedis();
      setDataSource({ transaction: jest.fn(async (run) => run({})) } as never);
      jest.spyOn(Order, 'findByIdForUpdate').mockResolvedValue(null);
      const log = jest.spyOn(Logger, 'error').mockImplementation();
      const findPayment = jest.spyOn(OrderPayment, 'findByOrderId');
      const createPayment = jest.spyOn(OrderPayment, 'create');
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.processNewEvent(EventStream.Orders, 'stream-missing', fields, redis);

      expect(findPayment).not.toHaveBeenCalled();
      expect(createPayment).not.toHaveBeenCalled();
      expect(redis.xack).not.toHaveBeenCalled();
      expect(redis.multi).toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('financial failed to handle event', {
        entryId: 'stream-missing',
        error: expect.any(Error),
      });
      expect(log).toHaveBeenCalledTimes(1);
    });

    it('reconciles a pending entry without retry metadata', async () => {
      const redis = mockConsumerRedis();
      (redis.xpending as jest.Mock).mockResolvedValueOnce([['stream-orphan', 'worker', 1000, 2]]);
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.reconcilePendingEvents(redis);

      expect(redis.xpending).toHaveBeenCalledWith('orders', 'financial', '-', '+', 100);
      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(transaction.hset).toHaveBeenCalledWith(
        'financial:retry:event:orders:stream-orphan',
        expect.objectContaining({ entryId: 'stream-orphan', deliveryCount: 2 }),
      );
      expect(transaction.zadd).toHaveBeenCalledWith(
        'financial:retry:schedule',
        expect.any(Number),
        'orders:stream-orphan',
      );
    });

    it('acknowledges a successful retry and removes its schedule and hash together', async () => {
      const redis = mockConsumerRedis();
      (redis.zrange as jest.Mock).mockResolvedValueOnce(['orders:stream-retry']);
      (redis.hgetall as jest.Mock).mockResolvedValueOnce({
        eventId: 'order-1',
        entryId: 'stream-retry',
        stream: 'orders',
        deliveryCount: '1',
        lastAttemptAt: '1000',
        nextAttemptAt: '2000',
        idleTimeMs: '0',
        lastError: 'Error: transient',
      });
      (redis.xclaim as jest.Mock).mockResolvedValueOnce([['stream-retry', fields]]);
      setDataSource({ transaction: jest.fn(async (run) => run({})) } as never);
      jest
        .spyOn(Order, 'findByIdForUpdate')
        .mockResolvedValue({ id: 'order-1', status: OrderStatus.PENDING } as OrderEntity);
      jest.spyOn(OrderPayment, 'findByOrderId').mockResolvedValue(null);
      jest.spyOn(OrderPayment, 'create').mockResolvedValue({ orderId: 'order-1' } as never);
      jest.spyOn(Order, 'update').mockResolvedValue({ id: 'order-1' } as OrderEntity);
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.retryPendingEvents(redis, 'retry-worker');

      const transaction = (redis.multi as jest.Mock).mock.results[0].value;
      expect(redis.xclaim).toHaveBeenCalledWith(
        'orders',
        'financial',
        'retry-worker',
        0,
        'stream-retry',
      );
      expect(transaction.xack).toHaveBeenCalledWith('orders', 'financial', 'stream-retry');
      expect(transaction.zrem).toHaveBeenCalledWith(
        'financial:retry:schedule',
        'orders:stream-retry',
      );
      expect(transaction.del).toHaveBeenCalledWith('financial:retry:event:orders:stream-retry');
    });

    it('sends invalid payload to dead letter before acknowledging', async () => {
      const redis = mockConsumerRedis();
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.processNewEvent(
        EventStream.Orders,
        'stream-3',
        ['event', 'OrderCreated', 'payload', '{invalid'],
        redis,
      );

      const call = (redis.xadd as jest.Mock).mock.calls[0] as string[];
      expect(call.slice(0, 2)).toEqual(['financial:dead-letter', '*']);
      expect(
        Object.fromEntries(
          Array.from({ length: 10 }, (_, index) => [call[2 + index * 2], call[3 + index * 2]]),
        ),
      ).toMatchObject({
        sourceStream: 'orders',
        sourceEntryId: 'stream-3',
        consumerGroup: 'financial',
        errorName: 'InvalidOrderCreatedPayloadError',
      });
      expect((redis.xadd as jest.Mock).mock.invocationCallOrder[0]).toBeLessThan(
        (redis.xack as jest.Mock).mock.invocationCallOrder[0],
      );
    });

    it('schedules a recoverable failure without acknowledging', async () => {
      const redis = mockConsumerRedis();
      setDataSource({ transaction: jest.fn(async (run) => run({})) } as never);
      jest.spyOn(Order, 'findByIdForUpdate').mockRejectedValue(new Error('database unavailable'));
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.processNewEvent(EventStream.Orders, 'stream-4', fields, redis);

      expect(redis.multi).toHaveBeenCalled();
      expect(redis.xack).not.toHaveBeenCalled();
      expect(redis.xadd).not.toHaveBeenCalled();
    });

    it('keeps the entry pending when dead letter publication fails', async () => {
      const redis = mockConsumerRedis();
      (redis.xadd as jest.Mock).mockRejectedValue(new Error('Redis unavailable'));
      const log = jest.spyOn(Logger, 'error').mockImplementation();
      const consumer = new ConsumerFinancial(redis, mockConsumerConfig());

      await consumer.processNewEvent(
        EventStream.Orders,
        'stream-5',
        ['event', 'OrderCreated', 'payload', '{invalid'],
        redis,
      );

      expect(redis.xack).not.toHaveBeenCalled();
      expect(log).toHaveBeenCalledWith('financial failed to handle event', {
        entryId: 'stream-5',
        error: expect.any(InvalidOrderCreatedPayloadError),
      });
      expect(log).toHaveBeenCalledTimes(1);
    });
  });
});
