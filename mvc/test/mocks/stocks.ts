import { DataSource } from 'typeorm';
export const stockProductMock = { id: 'product-1', name: 'Tea', price: 10, stock: 10 };
export function mockStocks() {
  return {
    findAll: jest.fn().mockResolvedValue([{ ...stockProductMock }]),
    findById: jest.fn().mockResolvedValue({ ...stockProductMock }),
    save: jest.fn().mockImplementation(async (product) => product),
  };
}
export function mockStockDataSource(repo: ReturnType<typeof mockStocks>): DataSource {
  return {
    getRepository: jest
      .fn()
      .mockReturnValue({ find: repo.findAll, findOne: repo.findById, save: repo.save }),
  } as unknown as DataSource;
}
