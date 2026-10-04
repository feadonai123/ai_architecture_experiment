export function mockQueryBuilder(result: unknown[] = []) {
  return {
    where: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
  };
}

export const productMock = {
  id: 'product-1',
  name: 'Tea',
  description: '',
  price: 10,
  stock: 10,
};

export const secondProductMock = {
  id: 'product-2',
  name: 'Coffee',
  description: '',
  price: 20,
  stock: 5,
};

export const unavailableProductMock = {
  ...productMock,
  id: 'product-3',
  name: 'Sold Out',
  stock: 0,
};
