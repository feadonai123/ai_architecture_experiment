import { NextFunction, Request, Response } from 'express';
import { requireEnv } from '../utils/env';

class ForbiddenError extends Error {
  readonly statusCode = 403;

  constructor() {
    super('Forbidden');
    this.name = 'ForbiddenError';
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const provided = req.header('x-api-key');
  if (provided !== requireEnv('X_API_KEY')) {
    next(new ForbiddenError());
    return;
  }
  next();
}
