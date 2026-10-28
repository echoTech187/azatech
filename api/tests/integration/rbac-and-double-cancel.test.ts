import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import crypto from 'crypto';
import { app } from '../../src/app';
import { prisma } from '../../src/config/database';

import { authService } from '../../src/modules/auth/auth.service';

describe('RBAC Authorization & Double-Cancel Protection Integration Tests', () => {
  let adminToken: string;
  let cashierToken: string;
  let customerId: string;

  beforeAll(async () => {
    const admin = await prisma.user.findFirstOrThrow({ where: { role: 'admin' } });
    const cashier = await prisma.user.findFirstOrThrow({ where: { role: 'cashier' } });

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: admin.email, password: 'Azatech@2026!' });
    adminToken = adminLogin.body.data?.access_token || authService.signAccessToken(admin);

    const cashierLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: cashier.email, password: 'Azatech@2026!' });
    cashierToken = cashierLogin.body.data?.access_token || authService.signAccessToken(cashier);

    const customer = await prisma.customer.findFirstOrThrow({ where: { deleted_at: null } });
    customerId = customer.id;
  });

  it('blocks cashier from deleting customer (403), managing products (403), or viewing sales reports (403)', async () => {
    const delCustomerRes = await request(app)
      .delete(`/api/customers/${customerId}`)
      .set('Authorization', `Bearer ${cashierToken}`);
    expect(delCustomerRes.status).toBe(403);

    const createProductRes = await request(app)
      .post('/api/products')
      .set('Authorization', `Bearer ${cashierToken}`)
      .send({
        product_code: `CASH-${Date.now()}`,
        product_name: 'Forbidden Product',
        stock: 10,
        price: 10000,
      });
    expect(createProductRes.status).toBe(403);

    const reportRes = await request(app)
      .get('/api/reports/sales')
      .set('Authorization', `Bearer ${cashierToken}`);
    expect(reportRes.status).toBe(403);
  });

  it('ensures double cancel request is safe and restores stock only once', async () => {
    const product = await prisma.product.create({
      data: {
        product_code: `DBL-CANC-${Date.now()}`,
        product_name: 'Produk Test Double Cancel',
        stock: 10,
        price: 12000,
        low_stock_threshold: 2,
      },
    });

    // Buat order qty = 4 (stok berkurang dari 10 menjadi 6)
    const createRes = await request(app)
      .post('/api/orders')
      .set('Authorization', `Bearer ${cashierToken}`)
      .set('Idempotency-Key', crypto.randomUUID())
      .send({
        customer_id: customerId,
        items: [{ product_id: Number(product.id), quantity: 4 }],
      });
    expect(createRes.status).toBe(201);
    const orderId = createRes.body.data.id;

    // Kirim 5 request cancel secara paralel oleh Admin
    const cancelResponses = await Promise.all(
      Array.from({ length: 5 }, () =>
        request(app)
          .post(`/api/orders/${orderId}/cancel`)
          .set('Authorization', `Bearer ${adminToken}`)
          .send({ cancel_reason: 'Stok dibatalkan paralel' })
      )
    );

    const okCount = cancelResponses.filter((r) => r.status === 200).length;
    const conflictCount = cancelResponses.filter((r) => r.status === 409).length;

    expect(okCount).toBe(1);
    expect(conflictCount).toBe(4);

    // Stok akhir wajib kembali ke 10 (bukan 26!)
    const finalProduct = await prisma.product.findUniqueOrThrow({ where: { id: product.id } });
    expect(finalProduct.stock).toBe(10);
  });
});
