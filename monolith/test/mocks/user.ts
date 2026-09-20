export function mockUserRepo(overrides: { findOne?: unknown } = {}) {
  return {
    findOne: jest.fn().mockResolvedValue('findOne' in overrides ? overrides.findOne : undefined),
  };
}
