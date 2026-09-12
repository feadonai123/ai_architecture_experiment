import { NextFunction, Request, Response } from 'express';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (
    err instanceof Error &&
    'statusCode' in err &&
    typeof (err as { statusCode: unknown }).statusCode === 'number'
  ) {
    const statusCode = (err as { statusCode: number }).statusCode;
    res.status(statusCode).json({
      error: err.name,
      message: err.message,
      statusCode,
    });
    return;
  }

  const message = err instanceof Error ? err.message : 'Internal server error';
  res.status(500).json({
    error: 'InternalError',
    message,
    statusCode: 500,
  });
}
