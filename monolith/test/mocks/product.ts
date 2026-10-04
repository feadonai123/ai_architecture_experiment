export function mockProductRepo(
  overrides: { find?: unknown; findOne?: unknown; save?: unknown; create?: unknown } = {},
) {
  return {
    find: jest.fn().mockResolvedValue('find' in overrides ? overrides.find : []),
    findOne: jest.fn().mockResolvedValue('findOne' in overrides ? overrides.findOne : undefined),
    save: jest
      .fn()
      .mockImplementation((product) =>
        Promise.resolve('save' in overrides ? overrides.save : product),
      ),
    create: jest
      .fn()
      .mockImplementation((product) => ('create' in overrides ? overrides.create : product)),
  };
}
