import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { ProductsService, productsService } from './product.service';
import { sendSuccess } from '../../common/response';
import { requireAuth, requireRoles } from '../../middlewares/auth.middleware';

const productsLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan katalog produk, coba lagi nanti.' },
});

const productBodySchema = z.object({
  product_code: z.string().min(2).max(50),
  product_name: z.string().min(2).max(200),
  stock: z.number().int().min(0),
  price: z.number().positive(),
  low_stock_threshold: z.number().int().min(0).default(5),
  is_active: z.boolean().optional(),
});

const productUpdateSchema = productBodySchema.omit({ stock: true }).partial();

const stockAdjustSchema = z.object({
  quantity_change: z.number().int().refine((v) => v !== 0, 'Perubahan stok tidak boleh 0'),
  note: z.string().min(3, 'Catatan stock opname wajib diisi (minimal 3 karakter)').max(255),
});

export class ProductsController {
  public readonly router: Router;

  constructor(private readonly service: ProductsService = productsService) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.use(productsLimiter);
    this.router.get('/', requireAuth, this.list);
    this.router.get('/:id', requireAuth, this.getById);
    this.router.post('/', requireAuth, requireRoles(['admin']), this.create);
    this.router.put('/:id', requireAuth, requireRoles(['admin']), this.update);
    this.router.delete('/:id', requireAuth, requireRoles(['admin']), this.remove);
    this.router.post(
      '/:id/stock-adjustments',
      requireAuth,
      requireRoles(['admin']),
      this.adjustStock
    );
    this.router.get(
      '/:id/stock-movements',
      requireAuth,
      requireRoles(['admin']),
      this.listStockMovements
    );
  }

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const perPage = Math.min(100, Math.max(1, Number(req.query.per_page ?? req.query.limit ?? 10)));
      const search = String(req.query.search ?? '').trim();
      const rawSortBy = String(req.query.sort_by ?? req.query.sort ?? '');
      const sortBy = ['product_name', 'product_code', 'price', 'stock', 'created_at'].includes(rawSortBy)
        ? rawSortBy
        : 'created_at';
      const rawSortDir = String(req.query.sort_dir ?? req.query.order ?? '');
      const sortDir = rawSortDir.toLowerCase() === 'asc' ? 'asc' : 'desc';

      let isActive: boolean | undefined = undefined;
      const statusParam = req.query.status ?? req.query.is_active;
      if (statusParam === 'active' || statusParam === 'true') {
        isActive = true;
      } else if (statusParam === 'inactive' || statusParam === 'false') {
        isActive = false;
      }

      const result = await this.service.listProducts({ page, perPage, search, sortBy, sortDir, isActive });
      sendSuccess(res, result.items, 'OK', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const product = await this.service.getProductById(BigInt(req.params.id));
      sendSuccess(res, product);
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = productBodySchema.parse(req.body);
      const created = await this.service.createProduct(body, req.user!.id);
      sendSuccess(res, created, 'Produk berhasil ditambahkan', 201);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = productUpdateSchema.parse(req.body);
      const updated = await this.service.updateProduct(BigInt(req.params.id), body);
      sendSuccess(res, updated, 'Produk berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  };

  public remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.softDeleteProduct(BigInt(req.params.id));
      sendSuccess(res, null, 'Produk berhasil dihapus (soft delete)');
    } catch (err) {
      next(err);
    }
  };

  public adjustStock = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = stockAdjustSchema.parse(req.body);
      const result = await this.service.adjustStock(BigInt(req.params.id), body, req.user!.id);
      sendSuccess(res, result, 'Penyesuaian stok berhasil disimpan', 201);
    } catch (err) {
      next(err);
    }
  };

  public listStockMovements = async (
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> => {
    try {
      const movements = await this.service.getStockMovements(BigInt(req.params.id));
      sendSuccess(res, movements);
    } catch (err) {
      next(err);
    }
  };
}

export const productsController = new ProductsController();
export const productsRouter = productsController.router;