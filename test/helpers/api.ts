import request from 'supertest';
import type { Express } from 'express';
import { requireEnv } from './env';
import { getApp } from './setup';

export function apiKeyHeader(): { 'x-api-key': string } {
  return { 'x-api-key': requireEnv('X_API_KEY') };
}

export function api(app?: Express) {
  const target = app ?? getApp();
  const headers = apiKeyHeader();
  return {
    get: (url: string) => request(target).get(url).set(headers),
    post: (url: string) => request(target).post(url).set(headers),
    put: (url: string) => request(target).put(url).set(headers),
    patch: (url: string) => request(target).patch(url).set(headers),
    delete: (url: string) => request(target).delete(url).set(headers),
  };
}
