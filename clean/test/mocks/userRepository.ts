import { UserRepository } from '../../src/ports/UserRepository';

export function mockUserRepository(exists = true): jest.Mocked<UserRepository> {
  return {
    exists: jest.fn().mockResolvedValue(exists),
  };
}
