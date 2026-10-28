import { prisma } from '../../config/database';
import { redis } from '../../config/redis';

export class ReportsService {
  private readonly DASHBOARD_CACHE_KEY = 'dashboard:summary';

  constructor(private readonly db: typeof prisma = prisma) {}

  async getDashboardSummary() {
    const cached = await redis.get(this.DASHBOARD_CACHE_KEY).catch(() => null);
    if (cached) {
      return { data: JSON.parse(cached), fromCache: true };
    }

    const [revenueAgg, statusGroups, lowStockCount] = await Promise.all([
      this.db.order.aggregate({
        where: { status: { in: ['PAID', 'SHIPPED', 'COMPLETED'] } },
        _sum: { total_amount: true },
        _count: { id: true },
      }),
      this.db.order.groupBy({
        by: ['status'],
        _count: { id: true },
      }),
      this.db.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM products
        WHERE deleted_at IS NULL AND stock < low_stock_threshold
      `,
    ]);

    const summary = {
      total_revenue: Number(revenueAgg._sum.total_amount ?? 0),
      total_paid_orders: revenueAgg._count.id,
      orders_by_status: Object.fromEntries(statusGroups.map((g) => [g.status, g._count.id])),
      low_stock_products_count: Number(lowStockCount[0]?.count ?? 0),
      generated_at: new Date().toISOString(),
    };

    await redis.set(this.DASHBOARD_CACHE_KEY, JSON.stringify(summary), 'EX', 300).catch(() => undefined);
    return { data: summary, fromCache: false };
  }

  async getSalesReport(fromDate: Date, toDate: Date, groupBy: 'day' | 'month') {
    const rows =
      groupBy === 'month'
        ? await this.db.$queryRaw<
            Array<{ period: Date; total_orders: bigint; total_revenue: number }>
          >`
            SELECT DATE_TRUNC('month', order_date) AS period,
                   COUNT(id)::bigint AS total_orders,
                   COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
            FROM orders
            WHERE status IN ('PAID', 'SHIPPED', 'COMPLETED')
              AND order_date >= ${fromDate}
              AND order_date <= ${toDate}
            GROUP BY 1
            ORDER BY 1 ASC
          `
        : await this.db.$queryRaw<
            Array<{ period: Date; total_orders: bigint; total_revenue: number }>
          >`
            SELECT DATE_TRUNC('day', order_date) AS period,
                   COUNT(id)::bigint AS total_orders,
                   COALESCE(SUM(total_amount), 0)::numeric AS total_revenue
            FROM orders
            WHERE status IN ('PAID', 'SHIPPED', 'COMPLETED')
              AND order_date >= ${fromDate}
              AND order_date <= ${toDate}
            GROUP BY 1
            ORDER BY 1 ASC
          `;

    return rows.map((r) => ({
      period: r.period,
      total_orders: Number(r.total_orders),
      total_revenue: Number(r.total_revenue),
    }));
  }

  async getTopProducts(fromDate: Date, toDate: Date, limit: number) {
    const rows = await this.db.$queryRaw<
      Array<{
        product_id: bigint;
        product_code: string;
        product_name: string;
        total_quantity: bigint;
        total_revenue: number;
      }>
    >`
      SELECT p.id AS product_id,
             p.product_code,
             p.product_name,
             SUM(oi.quantity)::bigint AS total_quantity,
             SUM(oi.subtotal)::numeric AS total_revenue
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN products p ON p.id = oi.product_id
      WHERE o.status IN ('PAID', 'SHIPPED', 'COMPLETED')
        AND o.order_date >= ${fromDate}
        AND o.order_date <= ${toDate}
      GROUP BY p.id, p.product_code, p.product_name
      ORDER BY total_quantity DESC, total_revenue DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({
      product_id: Number(r.product_id),
      product_code: r.product_code,
      product_name: r.product_name,
      total_quantity: Number(r.total_quantity),
      total_revenue: Number(r.total_revenue),
    }));
  }
}

export const reportsService = new ReportsService();
