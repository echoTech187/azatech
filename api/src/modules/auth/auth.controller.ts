import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';
import { AuthService, authService } from './auth.service';
import { requireAuth } from '../../middlewares/auth.middleware';
import { sendSuccess } from '../../common/response';

const loginSchema = z.object({
  email: z.string().email('Format email tidak valid'),
  password: z.string().min(1, 'Password wajib diisi'),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(10, 'Refresh token tidak valid'),
});

export class AuthController {
  public readonly router: Router;

  private readonly authLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30,
    skipSuccessfulRequests: true,
    message: { success: false, message: 'Terlalu banyak percobaan login gagal, coba lagi nanti.' },
  });

  constructor(private readonly service: AuthService = authService) {
    this.router = Router();
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.router.post('/login', this.authLimiter, this.login);
    this.router.post('/refresh', this.refresh);
    this.router.post('/logout', requireAuth, this.logout);
    this.router.get('/me', requireAuth, this.me);
  }

  public login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = loginSchema.parse(req.body);
      const result = await this.service.login(body.email, body.password);
      sendSuccess(res, result, 'Login berhasil');
    } catch (err) {
      next(err);
    }
  };

  public refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const body = refreshSchema.parse(req.body);
      const result = await this.service.refresh(body.refresh_token);
      sendSuccess(res, result, 'Token berhasil diperbarui');
    } catch (err) {
      next(err);
    }
  };

  public logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      await this.service.logout(req.user!.id, req.body?.refresh_token);
      sendSuccess(res, null, 'Logout berhasil');
    } catch (err) {
      next(err);
    }
  };

  public me = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const profile = await this.service.getProfile(req.user!.id);
      sendSuccess(res, profile);
    } catch (err) {
      next(err);
    }
  };
}

export const authController = new AuthController();