import request from 'supertest';
import { getApp } from '../../helpers/setup';

describe('GET /docs', () => {
  it('serves the shared Swagger UI without an API key', async () => {
    const response = await request(getApp()).get('/docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger');
  });
});
