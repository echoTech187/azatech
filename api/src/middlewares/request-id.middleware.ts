import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { logger } from '../config/logger';

declare global {
    namespace Express {
        interface Request {
            requestId: string;
            user?: {
                id: bigint;
                role: 'admin' | 'cashier';
                email: string;
            };
        }
    }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction): void {
    const incomingId = req.header('X-Request-Id');
    const requestId = incomingId && incomingId.trim().length > 0 ? incomingId : crypto.randomUUID();
    req.requestId = requestId;
    res.setHeader('X-Request-Id', requestId);

    const start = Date.now();
    res.on('finish', () => {
        logger.info({
            request_id: requestId,
            method: req.method,
            path: req.originalUrl,
            status_code: res.statusCode,
            duration_ms: Date.now() - start,
        });
    });

    next();
}