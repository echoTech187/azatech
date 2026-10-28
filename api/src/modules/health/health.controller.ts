import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { prisma } from '../../config/database';
import { redis } from '../../config/redis';
import { rabbitMQ } from '../../config/rabbitmq';
import { sendSuccess } from '../../common/response';

const healthLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan health check, coba lagi nanti.' },
});

export class HealthController {
  public readonly router: Router;

  constructor() {
    this.router = Router();
    this.router.use(healthLimiter);
    this.router.get('/', this.check);
  }

  public check = async (_req: Request, res: Response): Promise<void> => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      const redisPong = await redis.ping().catch(() => 'FAIL');
      const rmqUp = await rabbitMQ.checkHealth().catch(() => false);

      const isHealthy = redisPong === 'PONG' && rmqUp;

      sendSuccess(
        res,
        {
          status: isHealthy ? 'healthy' : 'degraded',
          database: 'up',
          redis: redisPong === 'PONG' ? 'up' : 'degraded',
          rabbitmq: rmqUp ? 'up' : 'degraded',
          timestamp: new Date().toISOString(),
        },
        'OK',
        isHealthy ? 200 : 200
      );
    } catch {
      res.status(503).json({
        success: false,
        message: 'Service unhealthy',
      });
    }
  };
}

export const healthController = new HealthController();
