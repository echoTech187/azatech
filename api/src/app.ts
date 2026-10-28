import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env';
import { requestIdMiddleware } from './middlewares/request-id.middleware';
import { errorMiddleware } from './middlewares/error.middleware';
import { authController, AuthController } from './modules/auth/auth.controller';
import { productsController, ProductsController } from './modules/products/product.module';
import { customersController, CustomersController } from './modules/customers/customers.controller';

export class Application {
  public readonly expressApp: Express;

  constructor(
    private readonly authModule: AuthController = authController,
    private readonly productsModule: ProductsController = productsController,
    private readonly customersModule: CustomersController = customersController
  ) {
    this.expressApp = express();
    this.configureMiddlewares();
    this.configureRoutes();
    this.configureErrorHandling();
  }

  private configureMiddlewares(): void {
    this.expressApp.use(helmet());
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

    this.expressApp.use('/api/auth', this.authModule.router);
    this.expressApp.use('/api/products', this.productsModule.router);
    this.expressApp.use('/api/customers', this.customersModule.router);
  }

  private configureErrorHandling(): void {
    this.expressApp.use(errorMiddleware);
  }
}

export const application = new Application();
export const app = application.expressApp;