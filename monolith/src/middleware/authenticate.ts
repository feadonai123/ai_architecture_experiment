import { NextFunction, Request, Response } from 'express';
import { ForbiddenError } from '../errors';
import { requireEnv } from '../helpers';

export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  const provided = req.header('x-api-key');
  if (provided !== requireEnv('X_API_KEY')) {
    next(new ForbiddenError());
    return;
  }
  next();
}
