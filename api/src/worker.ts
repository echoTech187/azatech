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
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#1e293b;">
          ${i.product.product_code} — ${i.product.product_name}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:center;color:#475569;">
          ${i.quantity}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;color:#475569;">
          Rp ${Number(i.unit_price).toLocaleString('id-ID')}
        </td>
        <td style="padding:10px 14px;border-bottom:1px solid #e2e8f0;text-align:right;font-weight:700;color:#0f172a;">
          Rp ${Number(i.subtotal).toLocaleString('id-ID')}
        </td>
      </tr>`
    )
    .join('');

  const orderDateStr = new Date(order.order_date).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <title>Invoice #${order.order_number} — Azatech Online Shop</title>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 24px; }
    .invoice-card { max-width: 760px; margin: 0 auto; background: #ffffff; padding: 36px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .toolbar { display: flex; justify-content: flex-end; gap: 10px; margin-bottom: 24px; }
    .btn { display: inline-flex; align-items: center; gap: 6px; padding: 9px 18px; font-size: 13px; font-weight: 700; border-radius: 10px; cursor: pointer; text-decoration: none; border: 1px solid transparent; transition: all 0.2s; }
    .btn-print { background: #0f172a; color: #ffffff; }
    .btn-print:hover { background: #334155; }
    .btn-download { background: #ecfdf5; color: #047857; border-color: #a7f3d0; }
    .btn-download:hover { background: #d1fae5; }
    .badge-paid { display: inline-block; padding: 4px 12px; background: #ecfdf5; color: #059669; font-weight: 800; font-size: 11px; border-radius: 9999px; border: 1px solid #a7f3d0; text-transform: uppercase; letter-spacing: 0.05em; }
    .table { width: 100%; border-collapse: collapse; margin-top: 24px; margin-bottom: 20px; }
    .table th { background: #f8fafc; padding: 12px 14px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; font-weight: 700; border-bottom: 2px solid #cbd5e1; }
    .total-box { margin-top: 16px; padding-top: 16px; border-top: 2px dashed #cbd5e1; display: flex; justify-content: space-between; align-items: center; }
    @media print {
      body { background: #ffffff; padding: 0; }
      .invoice-card { box-shadow: none; border: none; padding: 0; max-width: 100%; }
      .toolbar { display: none !important; }
    }
  </style>
</head>
<body>
  <div class="invoice-card">
    <div class="toolbar">
      <button id="btnPrint" class="btn btn-print" type="button">🖨️ Cetak / Simpan PDF</button>
      
    </div>

    <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 24px; border-bottom: 1px solid #e2e8f0; padding-bottom: 20px;">
      <div>
        <h1 style="margin:0 0 4px 0; font-size: 22px; font-weight: 900; color: #0f172a; letter-spacing: -0.02em;">AZATECH ONLINE SHOP</h1>
        <p style="margin:0; font-size: 13px; color: #64748b;">Invoice Bukti Transaksi Resmi</p>
      </div>
      <div style="text-align:right;">
        <span class="badge-paid">LUNAS / INVOICE</span>
        <div style="margin-top: 6px; font-size: 14px; font-family: monospace; font-weight: 800; color: #0f172a;">${order.order_number}</div>
        <div style="font-size: 12px; color: #64748b; margin-top: 2px;">${orderDateStr}</div>
      </div>
    </div>

    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 24px;">
      <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #94a3b8; margin-bottom: 6px;">Informasi Pelanggan</div>
      <div style="font-size: 15px; font-weight: 700; color: #0f172a;">${order.customer.customer_name}</div>
      <div style="font-size: 13px; color: #475569; margin-top: 2px;">${order.customer.customer_address}</div>
      ${order.customer.email ? `<div style="font-size: 12px; color: #64748b; margin-top: 2px;">✉️ ${order.customer.email}</div>` : ''}
    </div>

    <table class="table">
      <thead>
        <tr>
          <th>Produk</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Harga Satuan</th>
          <th style="text-align:right;">Subtotal</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>

    <div class="total-box">
      <div style="font-size: 14px; font-weight: 600; color: #64748b;">Total Tagihan Pembayaran</div>
      <div style="font-size: 22px; font-weight: 900; color: #0f172a; font-family: monospace;">Rp ${Number(order.total_amount).toLocaleString('id-ID')}</div>
    </div>

    <div style="margin-top: 36px; padding-top: 16px; border-top: 1px solid #f1f5f9; text-align: center; font-size: 12px; color: #94a3b8;">
      Terima kasih atas transaksi Anda di Azatech Online Shop. Simpan invoice ini sebagai bukti sah pembelian.
    </div>
  </div>

  <script>
    (function() {
      var printBtn = document.getElementById('btnPrint');
      if (printBtn) {
        printBtn.addEventListener('click', function() {
          window.print();
        });
      }
      var dlBtn = document.getElementById('btnDownload');
      if (dlBtn) {
        dlBtn.addEventListener('click', function() {
          var url = window.location.href;
          if (url.indexOf('download=1') === -1) {
            url += (url.indexOf('?') === -1 ? '?' : '&') + 'download=1';
          }
          window.location.href = url;
        });
      }
    })();
  </script>
</body>
</html>`;
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