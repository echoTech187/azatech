import 'dotenv/config';
import { PrismaClient, OrderStatus, Gender } from '../src/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });


async function main() {
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding Azatech Online Shop database...');
  const passwordHash = await bcrypt.hash('Azatech@2026!', 10);

  // 1. Seed 1 Admin & 1 Cashier
  const admin = await prisma.user.create({
    data: {
      name: 'Eko Susanto',
      email: 'ekosuesanto25@gmail.com',
      password: passwordHash,
      role: 'admin',
    },
  });

  const cashier = await prisma.user.create({
    data: {
      name: 'Rina Susanti',
      email: 'rishamoena23@gmail.com',
      password: passwordHash,
      role: 'cashier',
    },
  });

  // 2. Seed 50 Products + INITIAL Stock Movements
  const productCategories = [
    'Hydrococo', 'Indomie Goreng', 'Teh Botol Sosro', 'Kopi Kenangan Mantan',
    'Ultra Milk Coklat', 'Aqua 600ml', 'Chitato Sapi Panggang', 'Silverqueen Cashew',
    'Pocari Sweat', 'Bear Brand', 'Sari Roti Tawar', 'Good Day Cappuccino',
    'Minyak Goreng Bimoli', 'Gula Pasir Gulaku', 'Kecap Bango', 'Sambal ABC',
    'Sabun Lifebuoy', 'Shampoo Pantene', 'Pasta Gigi Pepsodent', 'Tisu Paseo'
  ];

  const products = [];
  for (let i = 1; i <= 50; i++) {
    const code = `P${String(i).padStart(4, '0')}`;
    const baseName = productCategories[(i - 1) % productCategories.length];
    const name = `${baseName} Variant #${i}`;
    const initialStock = 100 + (i % 50);
    const price = (Math.floor(i % 20) + 1) * 5000;

    const product = await prisma.product.create({
      data: {
        product_code: code,
        product_name: name,
        stock: initialStock,
        price: price,
        low_stock_threshold: 10,
        is_active: true,
      },
    });

    await prisma.stockMovement.create({
      data: {
        product_id: product.id,
        type: 'INITIAL',
        quantity_change: initialStock,
        stock_after: initialStock,
        reference_type: 'seed',
        reference_id: product.id.toString(),
        note: 'Stok awal seeder sistem',
        created_by: admin.id,
      },
    });

    products.push(product);
  }

  // 3. Seed 30 Customers
  const cities = ['Jakarta Selatan', 'Tangerang Selatan', 'Bandung', 'Surabaya', 'Yogyakarta', 'Semarang'];
  const customers = [];
  for (let i = 1; i <= 30; i++) {
    const gender: Gender = i % 2 === 0 ? 'Wanita' : 'Pria';
    const customer = await prisma.customer.create({
      data: {
        customer_name: `Pelanggan Mitra #${i}`,
        customer_address: `Jl. Merdeka No. ${i * 3}, ${cities[i % cities.length]}`,
        gender,
        birth_date: new Date(1990 + (i % 12), i % 12, (i % 25) + 1),
        phone: `08123456${String(i).padStart(4, '0')}`,
        email: `customer${i}@example.com`,
      },
    });
    customers.push(customer);
  }

  // 4. Seed 150 Orders distributed over the last 90 days
  const statuses: OrderStatus[] = ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'];
  const now = new Date();

  for (let i = 1; i <= 150; i++) {
    const daysAgo = i % 90;
    const orderDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
    const dateStr = orderDate.toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `INV-${dateStr}-${String(i).padStart(4, '0')}`;

    const status = statuses[i % statuses.length];
    const customer = customers[i % customers.length];
    const creator = i % 3 === 0 ? admin : cashier;

    const p1 = products[i % products.length];
    const p2 = products[(i + 7) % products.length];
    const qty1 = (i % 3) + 1;
    const qty2 = 1;

    const sub1 = Number(p1.price) * qty1;
    const sub2 = Number(p2.price) * qty2;
    const totalAmount = sub1 + sub2;

    const paidAt = ['PAID', 'SHIPPED', 'COMPLETED'].includes(status)
      ? new Date(orderDate.getTime() + 15 * 60 * 1000)
      : null;
    const shippedAt = ['SHIPPED', 'COMPLETED'].includes(status)
      ? new Date(orderDate.getTime() + 120 * 60 * 1000)
      : null;
    const completedAt = status === 'COMPLETED'
      ? new Date(orderDate.getTime() + 360 * 60 * 1000)
      : null;
    const cancelledAt = status === 'CANCELLED'
      ? new Date(orderDate.getTime() + 30 * 60 * 1000)
      : null;

    const order = await prisma.order.create({
      data: {
        order_number: orderNumber,
        customer_id: customer.id,
        created_by: creator.id,
        status,
        total_amount: totalAmount,
        paid_at: paidAt,
        shipped_at: shippedAt,
        completed_at: completedAt,
        cancelled_at: cancelledAt,
        cancel_reason: status === 'CANCELLED' ? 'Permintaan pembatalan oleh pelanggan' : null,
        invoice_sent_at: paidAt,
        order_date: orderDate,
        created_at: orderDate,
        items: {
          create: [
            {
              product_id: p1.id,
              quantity: qty1,
              unit_price: p1.price,
              subtotal: sub1,
            },
            {
              product_id: p2.id,
              quantity: qty2,
              unit_price: p2.price,
              subtotal: sub2,
            },
          ],
        },
      },
    });

    // Record stock movement for seeded order
    const currentP1 = await prisma.product.findUniqueOrThrow({ where: { id: p1.id } });
    const afterOut1 = currentP1.stock - qty1;
    await prisma.product.update({ where: { id: p1.id }, data: { stock: afterOut1 } });
    await prisma.stockMovement.create({
      data: {
        product_id: p1.id,
        type: 'ORDER_OUT',
        quantity_change: -qty1,
        stock_after: afterOut1,
        reference_type: 'order',
        reference_id: order.id.toString(),
        note: `Order ${orderNumber}`,
        created_by: creator.id,
        created_at: orderDate,
      },
    });

    if (status === 'CANCELLED') {
      const restored1 = afterOut1 + qty1;
      await prisma.product.update({ where: { id: p1.id }, data: { stock: restored1 } });
      await prisma.stockMovement.create({
        data: {
          product_id: p1.id,
          type: 'CANCEL_RESTORE',
          quantity_change: qty1,
          stock_after: restored1,
          reference_type: 'order',
          reference_id: order.id.toString(),
          note: `Pembatalan Order ${orderNumber}`,
          created_by: admin.id,
          created_at: cancelledAt ?? orderDate,
        },
      });
    }
  }

  console.log('Seeding completed: 1 admin, 1 cashier, 50 products, 30 customers, 150 orders.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });