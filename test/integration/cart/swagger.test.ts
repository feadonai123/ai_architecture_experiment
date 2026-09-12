import { api } from '../../helpers/api';

describe('GET /docs', () => {
  it('serves the shared Swagger UI', async () => {
    const response = await api().get('/docs/');

    expect(response.status).toBe(200);
    expect(response.text).toContain('swagger');
  });
});
