import { z } from 'zod';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(4000),
    DATABASE_URL: z.string().min(1),
    REDIS_URL: z.string().default('redis://localhost:6379'),
    RABBITMQ_URL: z.string().default('amqp://guest:guest@localhost:5672'),
    SMTP_HOST: z.string().default('localhost'),
    SMTP_PORT: z.coerce.number().default(1025),
    SMTP_FROM: z.string().default('noreply@azatech.id'),
    ADMIN_ALERT_EMAIL: z.string().default('admin@azatech.id'),
    JWT_ACCESS_SECRET: z.string().default('2df767ee41c38b7165bb2bb16efeb0aa6cbd1f61635998f38dc21692a2fd4738344e442e57854b7baa777e675ea6e9bc3e30d4fa1c71d24a522c4e5b54c49f12'),
    JWT_REFRESH_SECRET: z.string().default('8dc9017e468eee4459cfd342a44b936b04b9eb598e0ec69fc2a5f9a2f0401b39657fbc5d2d2255195e5f4e5ab04bd0a5d85a186a7fa0d0bdb0f7c3de44d3775f'),
    JWT_ACCESS_EXPIRES_IN: z.string().default('15m'),
    JWT_REFRESH_EXPIRES_DAYS: z.coerce.number().default(7),
    CORS_ORIGIN: z.string().default('http://localhost:3000'),
});

export const env = envSchema.parse(process.env);