export function mockOrderRepo(
  overrides: { create?: jest.Mock; findOne?: unknown; save?: unknown } = {},
) {
  return {
    create: overrides.create ?? jest.fn().mockImplementation((value) => value),
    findOne: jest.fn().mockResolvedValue('findOne' in overrides ? overrides.findOne : null),
    save: jest
      .fn()
      .mockImplementation((order) => Promise.resolve('save' in overrides ? overrides.save : order)),
  };
}
