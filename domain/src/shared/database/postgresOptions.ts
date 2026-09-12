import { requireEnv } from '../../utils/env';

export function postgresOptions() {
  return {
    type: 'postgres' as const,
    host: requireEnv('POSTGRES_HOST'),
    port: Number(requireEnv('POSTGRES_PORT')),
    username: requireEnv('POSTGRES_USER'),
    password: requireEnv('POSTGRES_PASSWORD'),
    database: requireEnv('POSTGRES_DB'),
    synchronize: false,
    logging: false,
  };
}
