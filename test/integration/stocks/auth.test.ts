import request from 'supertest';
import { v4 as uuidv4 } from 'uuid';
import { getApp } from '../../helpers/setup';

describe('Stock API key authentication', () => {
  it.each([undefined, 'wrong-key'])(
    'rejects unauthorized access to every stock route (%p)',
    async (key) => {
      const path = `/stocks/${uuidv4()}`;
      for (const [method, url] of [
        ['get', '/stocks'],
        ['get', path],
        ['put', path],
        ['patch', `${path}/increase`],
        ['patch', `${path}/decrease`],
      ] as const) {
        const call = request(getApp())[method](url);
        if (key !== undefined) {
          call.set('x-api-key', key);
        }

        const response = await call;

        expect(response.status).toBe(403);
        expect(response.body).toEqual({
          error: 'ForbiddenError',
          message: 'Forbidden',
          statusCode: 403,
        });
      }
    },
  );
});
