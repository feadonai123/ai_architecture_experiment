import Redis from 'ioredis';
import { requireEnv } from '../helpers';

export function createRedis(): Redis {
  return new Redis(requireEnv('REDIS_URL'));
}
