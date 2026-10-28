import { Router, Request, Response, NextFunction } from 'express';
import { ReportsService, reportsService } from './reports.service';
import { sendSuccess } from '../../common/response';
import { requireAuth, requireRoles } from '../../middlewares/auth.middleware';

export class ReportsController {
  public readonly router: Router;

  constructor(private readonly service: ReportsService = reportsService) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/dashboard/summary', requireAuth, this.getDashboardSummary);
    this.router.get(
      '/reports/sales',
      requireAuth,
      requireRoles(['admin']),
      this.getSalesReport
    );
    this.router.get(
      '/reports/top-products',
      requireAuth,
      requireRoles(['admin']),
      this.getTopProducts
    );
  }

  public getDashboardSummary = async (
    _req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const result = await this.service.getDashboardSummary();
      sendSuccess(res, result.data, result.fromCache ? 'OK (from cache)' : 'OK');
    } catch (err) {
      next(err);
    }
  };

  public getSalesReport = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const fromDate = req.query.from
        ? new Date(String(req.query.from))
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const toDate = req.query.to ? new Date(String(req.query.to)) : new Date();
      const groupBy = req.query.group_by === 'month' ? 'month' : 'day';

      const rows = await this.service.getSalesReport(fromDate, toDate, groupBy);
      sendSuccess(res, rows);
    } catch (err) {
      next(err);
    }
  };

  public getTopProducts = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const fromDate = req.query.from
        ? new Date(String(req.query.from))
        : new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const toDate = req.query.to ? new Date(String(req.query.to)) : new Date();
      const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 10)));

      const rows = await this.service.getTopProducts(fromDate, toDate, limit);
      sendSuccess(res, rows);
    } catch (err) {
      next(err);
    }
  };
}

export const reportsController = new ReportsController();
export const reportsRouter = reportsController.router;
