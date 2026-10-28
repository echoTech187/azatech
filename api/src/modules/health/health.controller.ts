import { Router, Request, Response } from 'express';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { sendSuccess } from '../../common/response';

export class HealthController {
  public readonly router: Router;

  constructor() {
    this.router = Router();
    this.router.get('/', this.check);
  }

  public check = async (_req: Request, res: Response): Promise<void> => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const redisPong = await redis.ping();
      sendSuccess(res, {
        status: 'healthy',
        database: 'up',
        redis: redisPong === 'PONG' ? 'up' : 'degraded',
        timestamp: new Date().toISOString(),
      });
    } catch {
      res.status(503).json({
        success: false,
        message: 'Service unhealthy',
      });
    }
  };
}

export const healthController = new HealthController();
