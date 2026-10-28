import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { CustomersService, customersService } from './customers.service';
import { sendSuccess } from '../../common/response';
import { requireAuth, requireRoles } from '../../middlewares/auth.middleware';

const customerBodySchema = z.object({
  customer_name: z.string().min(2, 'Nama pelanggan minimal 2 karakter').max(150),
  customer_address: z.string().min(3, 'Alamat pelanggan wajib diisi'),
  gender: z.enum(['Pria', 'Wanita']),
  birth_date: z
    .string()
    .refine((val) => !Number.isNaN(Date.parse(val)), 'Format tanggal lahir tidak valid'),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email('Format email tidak valid').nullable().optional(),
});

export class CustomersController {
  public readonly router: Router;

  constructor(private readonly service: CustomersService = customersService) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.get('/', requireAuth, this.list);
    this.router.get('/:id', requireAuth, this.getById);
    this.router.post('/', requireAuth, requireRoles(['admin', 'cashier']), this.create);
    this.router.put('/:id', requireAuth, requireRoles(['admin', 'cashier']), this.update);
    // HANYA Admin yang boleh menghapus pelanggan (Cashier otomatis ditolak 403 Forbidden)
    this.router.delete('/:id', requireAuth, requireRoles(['admin']), this.remove);
  }

  public list = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const page = Math.max(1, Number(req.query.page ?? 1));
      const perPage = Math.min(100, Math.max(1, Number(req.query.per_page ?? 10)));
      const search = String(req.query.search ?? '').trim();
      const sortBy = ['customer_name', 'created_at', 'birth_date'].includes(
        String(req.query.sort_by)
      )
        ? String(req.query.sort_by)
        : 'created_at';
      const sortDir = req.query.sort_dir === 'asc' ? 'asc' : 'desc';

      const result = await this.service.listCustomers({ page, perPage, search, sortBy, sortDir });
      sendSuccess(res, result.items, 'OK', 200, result.meta);
    } catch (err) {
      next(err);
    }
  };

  public getById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const customer = await this.service.getCustomerById(req.params.id);
      sendSuccess(res, customer);
    } catch (err) {
      next(err);
    }
  };

  public create = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = customerBodySchema.parse(req.body);
      const created = await this.service.createCustomer(body);
      sendSuccess(res, created, 'Pelanggan berhasil ditambahkan', 201);
    } catch (err) {
      next(err);
    }
  };

  public update = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = customerBodySchema.partial().parse(req.body);
      const updated = await this.service.updateCustomer(req.params.id, body);
      sendSuccess(res, updated, 'Data pelanggan berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  };

  public remove = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.softDeleteCustomer(req.params.id);
      sendSuccess(res, null, 'Pelanggan berhasil dihapus');
    } catch (err) {
      next(err);
    }
  };
}

export const customersController = new CustomersController();
export const customersRouter = customersController.router;
