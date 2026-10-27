import nodemailer from 'nodemailer';
import { prisma } from './config/database';
import { env } from './config/env';
import { logger } from './config/logger';
import { rabbitMQ, QUEUE_INVOICE_PAID, QUEUE_STOCK_LOW } from './config/rabbitmq';

const mailer = nodemailer.createTransport({
  host: env.SMTP_HOST,
  port: env.SMTP_PORT,
  secure: false,
});

export function buildInvoiceHtml(order: {
  order_number: string;
  order_date: Date;
  paid_at: Date | null;
  total_amount: unknown;
  customer: { customer_name: string; customer_address: string; email: string | null };
  items: Array<{
    quantity: number;
    unit_price: unknown;
    subtotal: unknown;
    product: { product_code: string; product_name: string };
  }>;
}): string {
  const rows = order.items
    .map(
      (i) => `
      <tr>
        <td style="padding:8px;border:1px solid #ddd;">${i.product.product_code} - ${i.product.product_name}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:center;">${i.quantity}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">Rp ${Number(i.unit_price).toLocaleString('id-ID')}</td>
        <td style="padding:8px;border:1px solid #ddd;text-align:right;">Rp ${Number(i.subtotal).toLocaleString('id-ID')}</td>
      </tr>`
    )
    .join('');

  return `
    <div style="font-family:sans-serif;max-width:680px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;">
      <h2 style="margin:0 0 8px 0;color:#111827;">INVOICE PEMBAYARAN — ${order.order_number}</h2>
      <p style="margin:0 0 16px 0;color:#4b5563;">Pelanggan: <strong>${order.customer.customer_name}</strong> (${order.customer.customer_address})</p>
      <table style="width:100%;border-collapse:collapse;margin-bottom:16px;">
        <thead>
          <tr style="background:#f3f4f6;">
            <th style="padding:8px;border:1px solid #ddd;text-align:left;">Produk</th>
            <th style="padding:8px;border:1px solid #ddd;">Qty</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Harga Satuan</th>
            <th style="padding:8px;border:1px solid #ddd;text-align:right;">Subtotal</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <h3 style="text-align:right;color:#111827;">Total Bayar: Rp ${Number(order.total_amount).toLocaleString('id-ID')}</h3>
    </div>
  `;
}

async function startWorker() {
  const channel = await rabbitMQ.getChannel();
  await channel.prefetch(5);

  logger.info('RabbitMQ Worker started. Listening on queues...');

  // Consumer 1: Order Paid -> Generate Invoice & Send Email to Customer (Idempotent)
  await channel.consume(QUEUE_INVOICE_PAID, async (msg) => {
    if (!msg) return;
    try {
      const payload = JSON.parse(msg.content.toString()) as { orderId: number };
      const order = await prisma.order.findUnique({
        where: { id: BigInt(payload.orderId) },
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });

      if (!order) {
        channel.ack(msg);
        return;
      }

      // Idempotent guard: jangan kirim email ganda jika invoice_sent_at sudah terisi
      if (order.invoice_sent_at !== null) {
        logger.info({ orderId: payload.orderId }, 'Invoice already sent, skipping duplicate job');
        channel.ack(msg);
        return;
      }

      const html = buildInvoiceHtml(order);
      const recipient = order.customer.email ?? 'customer@example.com';

      await mailer.sendMail({
        from: env.SMTP_FROM,
        to: recipient,
        subject: `Invoice Pembayaran Order ${order.order_number}`,
        html,
      });

      await prisma.order.update({
        where: { id: order.id },
        data: { invoice_sent_at: new Date() },
      });

      logger.info({ orderNumber: order.order_number, recipient }, 'Invoice email sent via Mailpit');
      channel.ack(msg);
    } catch (err) {
      logger.error({ err }, 'Failed processing invoice job, sending to DLX/retry');
      channel.nack(msg, false, false);
    }
  });

  // Consumer 2: Low Stock Alert -> Send Notification Email to Admin
  await channel.consume(QUEUE_STOCK_LOW, async (msg) => {
    if (!msg) return;
    try {
      const alert = JSON.parse(msg.content.toString()) as {
        productCode: string;
        productName: string;
        stockAfter: number;
        threshold: number;
      };

      await mailer.sendMail({
        from: env.SMTP_FROM,
        to: env.ADMIN_ALERT_EMAIL,
        subject: `[LOW STOCK ALERT] ${alert.productCode} - ${alert.productName}`,
        html: `<p>Stok produk <strong>${alert.productName} (${alert.productCode})</strong> saat ini tersisa <strong>${alert.stockAfter}</strong> (di bawah batas minimum ${alert.threshold}).</p>`,
      });

      logger.info({ alert }, 'Low stock alert email sent to admin');
      channel.ack(msg);
    } catch (err) {
      logger.error({ err }, 'Failed processing low stock alert job');
      channel.nack(msg, false, false);
    }
  });
}

startWorker().catch((err) => {
  logger.error({ err }, 'Worker crashed');
  process.exit(1);
});