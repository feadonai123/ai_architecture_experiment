import { api } from '../../helpers/api';

describe('POST /cart', () => {
  describe('success', () => {
    it('creates an empty cart', async () => {
      const response = await api().post('/cart');

      expect(response.status).toBe(201);
      expect(response.body).toEqual({
        id: expect.any(String),
        createdAt: expect.any(String),
        items: [],
      });
      expect(Number.isNaN(Date.parse(response.body.createdAt))).toBe(false);
    });
  });
});
