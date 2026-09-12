import { NextFunction, Request, Response } from 'express';
import { Logger } from '../utils/Logger';

export function audit(req: Request, res: Response, next: NextFunction): void {
  Logger.info('route called', {
    method: req.method,
    path: req.path,
    params: req.params,
    query: req.query,
    body: req.body,
  });

  const originalJson = res.json.bind(res);
  res.json = ((body: unknown) => {
    Logger.info('route response', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      body,
    });
    return originalJson(body);
  }) as Response['json'];

  next();
}
