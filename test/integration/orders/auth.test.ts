import request from 'supertest';
import { api } from '../../helpers/api';
import { getApp, getTestDataSource } from '../../helpers/setup';
import { ProductPrefab } from '../../prefabs/product.prefab';
import { UserPrefab } from '../../prefabs/user.prefab';

describe('Order API key authentication', () => {
  it('returns ForbiddenError when the header is missing', async () => {
    const response = await request(getApp()).post('/orders').send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'ForbiddenError',
      message: 'Forbidden',
      statusCode: 403,
    });
  });

  it('returns ForbiddenError when the header is invalid', async () => {
    const response = await request(getApp()).post('/orders').set('x-api-key', 'wrong-key').send({});

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'ForbiddenError',
      message: 'Forbidden',
      statusCode: 403,
    });
  });

  it('accepts requests with a valid x-api-key header', async () => {
    const dataSource = getTestDataSource();
    const user = await UserPrefab.create(dataSource);
    const product = await ProductPrefab.create(dataSource);

    const response = await api()
      .post('/orders')
      .send({
        userId: user.id,
        items: [{ productId: product.id, quantity: 1 }],
      });

    expect(response.status).toBe(201);
  });
});
