import { api } from '../../helpers/api';

describe('POST /products', () => {
  describe('success', () => {
    it('creates a product with stock 0', async () => {
      const response = await api().post('/products').send({
        name: 'Tea',
        description: 'Green leaves',
        price: 10,
      });

      expect(response.status).toBe(201);
      expect(response.body.name).toBe('Tea');
      expect(response.body.description).toBe('Green leaves');
      expect(response.body.price).toBe(10);
      expect(response.body.stock).toBe(0);
      expect(response.body.id).toEqual(expect.any(String));
    });
  });

  describe('errors', () => {
    it('returns InvalidNameError', async () => {
      const response = await api().post('/products').send({ name: '  ', price: 10 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidNameError');
      expect(response.body.statusCode).toBe(400);
    });

    it('returns InvalidPriceError', async () => {
      const response = await api().post('/products').send({ name: 'Tea', price: -1 });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe('InvalidPriceError');
      expect(response.body.statusCode).toBe(400);
    });
  });
});
