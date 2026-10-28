import { describe, it, expect, beforeAll } from 'vitest';
import crypto from 'crypto';
import { prisma } from '../../src/config/database';
import { ordersService } from '../../src/modules/orders/orders.service';

describe('Order Concurrency & Idempotency Integration Tests (PostgreSQL)', () => {
  let userId: bigint;
  let customerId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: 'admin' } });
    const customer = await prisma.customer.findFirstOrThrow({ where: { deleted_at: null } });
    userId = admin.id;
    customerId = customer.id;
  });

  it('prevents overselling: stock 5 with 20 parallel order requests (qty 1) -> exactly 5 succeed, 15 fail, final stock 0', async () => {
    const product = await prisma.product.create({
      data: {
        product_code: `CONC-${Date.now()}`,
        product_name: 'Produk Test Concurrency Stok 5',
        stock: 5,
        price: 15000,
        low_stock_threshold: 2,
      },
    });

    const requests = Array.from({ length: 20 }, () =>
      ordersService
        .createOrder({
          userId,
          idempotencyKey: crypto.randomUUID(),
          customerId,
          items: [{ product_id: Number(product.id), quantity: 1 }],
        })
        .then((res) => ({ ok: true, status: res.statusCode }))
        .catch((err) => ({ ok: false, status: err.statusCode }))
    );

    const results = await Promise.all(requests);
    const successCount = results.filter((r) => r.ok && r.status === 201).length;
    const failedCount = results.filter((r) => !r.ok && r.status === 422).length;

    const updatedProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });

    expect(successCount).toBe(5);
    expect(failedCount).toBe(15);
    expect(updatedProduct.stock).toBe(0);
  });

  it('enforces idempotency: same key + same payload returns identical order without deducting stock twice, different payload returns 422', async () => {
    const product = await prisma.product.create({
      data: {
        product_code: `IDEMP-${Date.now()}`,
        product_name: 'Produk Test Idempotency',
        stock: 10,
        price: 20000,
        low_stock_threshold: 2,
      },
    });

    const idempotencyKey = crypto.randomUUID();
    const first = await ordersService.createOrder({
      userId,
      idempotencyKey,
      customerId,
      items: [{ product_id: Number(product.id), quantity: 2 }],
    });

    const secondReplay = await ordersService.createOrder({
      userId,
      idempotencyKey,
      customerId,
      items: [{ product_id: Number(product.id), quantity: 2 }],
    });

    expect(first.statusCode).toBe(201);
    expect(secondReplay.body).toEqual(first.body);

    const productAfterReplay = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(productAfterReplay.stock).toBe(8); // Hanya berkurang 2 satu kali!

    // Kirim key yang sama tetapi quantity berbeda -> wajib ditolak 422
    await expect(
      ordersService.createOrder({
        userId,
        idempotencyKey,
        customerId,
        items: [{ product_id: Number(product.id), quantity: 5 }],
      })
    ).rejects.toThrowError(/payload berbeda/);
  });
});
