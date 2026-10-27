import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../common/errors';
import { logger } from '../config/logger';
import { env } from '../config/env';

export function errorMiddleware(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): Response {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      ...(err.errors ? { errors: err.errors } : {}),
    });
  }

  if (err instanceof ZodError) {
    const fieldErrors: Record<string, string[]> = {};
    for (const issue of err.issues) {
      const pathKey = issue.path.join('.');
      if (!fieldErrors[pathKey]) {
        fieldErrors[pathKey] = [];
      }
      fieldErrors[pathKey].push(issue.message);
    }
    return res.status(422).json({
      success: false,
      message: 'Validasi input gagal',
      errors: fieldErrors,
    });
  }

  logger.error({ err, request_id: req.requestId }, 'Unhandled internal server error');

  return res.status(500).json({
    success: false,
    message: 'Terjadi kesalahan internal pada server',
    ...(env.NODE_ENV !== 'production' && err instanceof Error ? { debug: err.message } : {}),
  });
}