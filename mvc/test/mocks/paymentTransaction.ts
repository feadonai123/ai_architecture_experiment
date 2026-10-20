import { DataSource } from 'typeorm';
export function mockPaymentTransaction(): DataSource {
  return { transaction: jest.fn(async (run) => run({})) } as unknown as DataSource;
}
