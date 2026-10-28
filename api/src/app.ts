import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { authController, AuthController } from './modules/auth/auth.controller';
import { productsController, ProductsController } from './modules/products/product.module';
import { customersController, CustomersController } from './modules/customers/customers.controller';
import { ordersController, OrdersController } from './modules/orders/orders.controller';
import { reportsController, ReportsController } from './modules/reports/reports.controller';
import { healthController, HealthController } from './modules/health/health.controller';
import swaggerUi from 'swagger-ui-express';
import rateLimit from 'express-rate-limit';
import { swaggerDocument } from './config/swagger';

const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Terlalu banyak permintaan API, coba lagi nanti.' },
});

export class Application {
  public readonly expressApp: Express;

  constructor(
    private readonly healthModule: HealthController = healthController,
    private readonly authModule: AuthController = authController,
    private readonly productsModule: ProductsController = productsController,
    private readonly customersModule: CustomersController = customersController,
    private readonly ordersModule: OrdersController = ordersController,
    private readonly reportsModule: ReportsController = reportsController
  ) {
    this.expressApp = express();
    this.configureMiddlewares();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddlewares(): void {
    this.expressApp.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
          },
        },
      })
    );
    this.expressApp.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
    this.expressApp.use(express.json());
    this.expressApp.use(requestIdMiddleware);
  }

  private configureRoutes(): void {
    this.expressApp.get(['/', '/api'], (_req, res) => {
      res.json({
        success: true,
        message: 'Azatech Online Shop API Server is running',
        status: 'healthy',
      });
    });

    this.expressApp.use('/api', globalApiLimiter);
    this.expressApp.use('/api/health', this.healthModule.router);
    this.expressApp.use('/api/auth', this.authModule.router);
    this.expressApp.use('/api/products', this.productsModule.router);
    this.expressApp.use('/api/customers', this.customersModule.router);
    this.expressApp.use('/api/orders', this.ordersModule.router);
    this.expressApp.use('/api', this.reportsModule.router);

    this.expressApp.get('/api/docs.json', (_req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.send(swaggerDocument);
    });

    this.expressApp.use(
      '/api/docs',
      (_req: Request, res: Response, next: NextFunction) => {
        res.removeHeader('Content-Security-Policy');
        next();
      },
      swaggerUi.serve,
      swaggerUi.setup(swaggerDocument, {
        customSiteTitle: 'Azatech API Documentation — Swagger UI',
        customCss: '.swagger-ui .topbar { display: none }',
      })
    );
  }

  private configureErrorHandling(): void {
    this.expressApp.use(errorMiddleware);
  }
}

export const application = new Application();
export const app = application.expressApp;