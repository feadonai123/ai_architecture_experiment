export function mockUserRepository(exists = true) {
  return {
    exists: jest.fn().mockResolvedValue(exists),
  };
}
