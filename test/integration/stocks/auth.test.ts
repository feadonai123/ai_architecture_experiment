import request from 'supertest';
import { api } from '../../helpers/api';
import { getApp } from '../../helpers/setup';

describe('API key authentication', () => {
  it('returns ForbiddenError when the header is missing', async () => {
    const response = await request(getApp()).get('/stocks');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: 'ForbiddenError',
      message: 'Forbidden',
      statusCode: 403,
    });
  });

  it('returns ForbiddenError when the header is invalid', async () => {
    const response = await request(getApp()).get('/stocks').set('x-api-key', 'wrong-key');

    expect(response.status).toBe(403);
    expect(response.body.error).toBe('ForbiddenError');
    expect(response.body.statusCode).toBe(403);
  });

  it('accepts requests with a valid x-api-key header', async () => {
    const response = await api().get('/stocks');

    expect(response.status).toBe(200);
  });
});
