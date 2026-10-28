import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { prisma } from '../../config/database';
import { OrdersService, ordersService } from './orders.service';
import { buildInvoiceHtml } from '../../worker';
import { AppError } from '../../common/errors';
import { sendSuccess } from '../../common/response';
import { requireAuth, requireRoles } from '../../middlewares/auth.middleware';

const createOrderSchema = z.object({
  customer_id: z.string().uuid(),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive(),
        quantity: z.number().int().positive(),
      })
    )
    .min(1, 'Order minimal harus memiliki 1 produk'),
});

export class OrdersController {
  public readonly router: Router;

  private readonly orderLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { success: false, message: 'Terlalu banyak request pembuatan order.' },
  });

  constructor(private readonly service: OrdersService = ordersService) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', requireAuth, this.list);
    this.router.get('/:id', requireAuth, this.getById);
    this.router.post('/', requireAuth, this.orderLimiter, this.create);
    this.router.post('/:id/pay', requireAuth, requireRoles(['admin', 'cashier']), this.pay);
    this.router.post('/:id/ship', requireAuth, requireRoles(['admin']), this.ship);
    this.router.post('/:id/complete', requireAuth, requireRoles(['admin']), this.complete);
    this.router.post('/:id/cancel', requireAuth, requireRoles(['admin']), this.cancel);
    this.router.get('/:id/invoice', requireAuth, this.downloadInvoice);
  }

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const perPage = Math.min(100, Math.max(1, Number(req.query.per_page ?? 10)));
      const status = req.query.status ? String(req.query.status) : undefined;
      const customerId = req.query.customer_id ? String(req.query.customer_id) : undefined;
      const fromDate = req.query.from ? new Date(String(req.query.from)) : undefined;
      const toDate = req.query.to ? new Date(String(req.query.to)) : undefined;

      const where = {
        ...(status ? { status: status as any } : {}),
        ...(customerId ? { customer_id: customerId } : {}),
        ...(fromDate || toDate
          ? {
              order_date: {
                ...(fromDate ? { gte: fromDate } : {}),
                ...(toDate ? { lte: toDate } : {}),
              },
            }
          : {}),
      };

      const [total, orders] = await Promise.all([
        prisma.order.count({ where }),
        prisma.order.findMany({
          where,
          include: {
            customer: true,
            creator: { select: { id: true, name: true, role: true } },
          },
          orderBy: { order_date: 'desc' },
          skip: (page - 1) * perPage,
          take: perPage,
        }),
      ]);

      sendSuccess(res, orders, 'OK', 200, {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      });
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: BigInt(req.params.id) },
        include: {
          customer: true,
          creator: { select: { id: true, name: true, email: true, role: true } },
          items: { include: { product: true } },
        },
      });
      if (!order) {
        throw new AppError(404, 'Order tidak ditemukan');
      }
      sendSuccess(res, order);
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const idempotencyKey = req.header('Idempotency-Key');
      if (!idempotencyKey || !z.string().uuid().safeParse(idempotencyKey).success) {
        throw new AppError(422, 'Header Idempotency-Key (format UUID) wajib disertakan');
      }
      const body = createOrderSchema.parse(req.body);
      const result = await this.service.createOrder({
        userId: req.user!.id,
        idempotencyKey,
        customerId: body.customer_id,
        items: body.items,
      });
      res.status(result.statusCode).json(result.body);
    } catch (err) {
      next(err);
    }
  };

  public pay = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.service.transitionStatus(BigInt(req.params.id), 'PAY', req.user!);
      sendSuccess(res, order, 'Order berhasil ditandai PAID');
    } catch (err) {
      next(err);
    }
  };

  public ship = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.service.transitionStatus(BigInt(req.params.id), 'SHIP', req.user!);
      sendSuccess(res, order, 'Order berhasil ditandai SHIPPED');
    } catch (err) {
      next(err);
    }
  };

  public complete = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.service.transitionStatus(BigInt(req.params.id), 'COMPLETE', req.user!);
      sendSuccess(res, order, 'Order berhasil ditandai COMPLETED');
    } catch (err) {
      next(err);
    }
  };

  public cancel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const order = await this.service.transitionStatus(
        BigInt(req.params.id),
        'CANCEL',
        req.user!,
        req.body?.cancel_reason
      );
      sendSuccess(res, order, 'Order berhasil dibatalkan dan stok telah dikembalikan');
    } catch (err) {
      next(err);
    }
  };

  public downloadInvoice = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const order = await prisma.order.findUnique({
        where: { id: BigInt(req.params.id) },
        include: { customer: true, items: { include: { product: true } } },
      });
      if (!order) throw new AppError(404, 'Order tidak ditemukan');
      const html = buildInvoiceHtml(order);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(html);
    } catch (err) {
      next(err);
    }
  };
}

export const ordersController = new OrdersController();
export const ordersRouter = ordersController.router;
