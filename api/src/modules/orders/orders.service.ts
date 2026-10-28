import crypto from 'crypto';
import { Prisma, OrderStatus, Role } from '../../generated/prisma/client';
import { prisma } from '../../config/database';
import { rabbitMQ } from '../../config/rabbitmq';
import { redis } from '../../config/redis';
import { AppError } from '../../common/errors';
import { serializeBigInt } from '../../common/response';
import { OrderStateMachine, OrderAction } from './order.state-machine';

export type { OrderAction };

export interface CreateOrderInput {
  userId: bigint;
  idempotencyKey: string;
  customerId: string;
  items: Array<{ product_id: number; quantity: number }>;
}

interface LockedProductRow {
  id: bigint;
  product_code: string;
  product_name: string;
  stock: number;
  price: Prisma.Decimal;
  low_stock_threshold: number;
}

export class OrdersService {
  private computeRequestHash(
    userId: bigint,
    customerId: string,
    items: Array<{ product_id: number; quantity: number }>
  ): string {
    const normalizedItems = [...items]
      .map((i) => ({
        product_id: Number(i.product_id),
        quantity: Number(i.quantity),
      }))
      .sort((a, b) => a.product_id - b.product_id);
    const raw = JSON.stringify({
      userId: userId.toString(),
      customerId,
      items: normalizedItems,
    });
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  async createOrder(input: CreateOrderInput) {
    const requestHash = this.computeRequestHash(input.userId, input.customerId, input.items);
    const now = new Date();
    const lockedUntil = new Date(now.getTime() + 60 * 1000);
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    // 1. Cek Idempotency Key di PostgreSQL
    const existing = await prisma.idempotencyKey.findUnique({
      where: { key: input.idempotencyKey },
    });

    if (existing && existing.expires_at > now) {
      if (existing.request_hash !== requestHash) {
        throw new AppError(422, 'Idempotency-Key tidak boleh digunakan ulang dengan payload berbeda');
      }
      if (existing.status === 'PROCESSING' && existing.locked_until > now) {
        throw new AppError(409, 'Request dengan Idempotency-Key ini masih sedang diproses');
      }
      if (existing.status === 'COMPLETED' && existing.response_body) {
        return {
          statusCode: existing.response_code ?? 201,
          body: existing.response_body as Record<string, unknown>,
        };
      }
    }

    try {
      await prisma.idempotencyKey.upsert({
        where: { key: input.idempotencyKey },
        create: {
          key: input.idempotencyKey,
          user_id: input.userId,
          request_hash: requestHash,
          status: 'PROCESSING',
          locked_until: lockedUntil,
          expires_at: expiresAt,
        },
        update: {
          request_hash: requestHash,
          status: 'PROCESSING',
          locked_until: lockedUntil,
          expires_at: expiresAt,
        },
      });
    } catch {
      throw new AppError(409, 'Request dengan Idempotency-Key ini sedang diproses');
    }

    // 2. Gabungkan duplikat product_id & urutkan ASC untuk mencegah Deadlock
    const mergedQty = new Map<bigint, number>();
    for (const item of input.items) {
      const pid = BigInt(item.product_id);
      mergedQty.set(pid, (mergedQty.get(pid) ?? 0) + item.quantity);
    }
    const sortedProductIds = Array.from(mergedQty.keys()).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));

    const lowStockEvents: Array<{
      productId: number;
      productCode: string;
      productName: string;
      stockAfter: number;
      threshold: number;
    }> = [];

    try {
      const responseBody = await prisma.$transaction(async (tx) => {
        const customer = await tx.customer.findFirst({
          where: { id: input.customerId, deleted_at: null },
        });
        if (!customer) {
          throw new AppError(404, 'Pelanggan tidak ditemukan');
        }

        // Pessimistic Lock: SELECT ... ORDER BY id ASC FOR UPDATE
        const lockedProducts = await tx.$queryRaw<LockedProductRow[]>`
          SELECT id, product_code, product_name, stock, price, low_stock_threshold
          FROM products
          WHERE id = ANY(${sortedProductIds}::bigint[])
            AND deleted_at IS NULL
          ORDER BY id ASC
          FOR UPDATE
        `;

        const productMap = new Map<string, LockedProductRow>(
          lockedProducts.map((p) => [p.id.toString(), p])
        );

        const errors: Record<string, string[]> = {};
        input.items.forEach((reqItem, idx) => {
          const p = productMap.get(BigInt(reqItem.product_id).toString());
          const needed = mergedQty.get(BigInt(reqItem.product_id)) ?? reqItem.quantity;
          if (!p) {
            errors[`items.${idx}.product_id`] = [`Produk ID ${reqItem.product_id} tidak ditemukan`];
          } else if (p.stock < needed) {
            errors[`items.${idx}.quantity`] = [
              `Stok ${p.product_name} tersisa ${p.stock}, diminta ${needed}`,
            ];
          }
        });

        if (Object.keys(errors).length > 0) {
          throw new AppError(422, 'Stok tidak mencukupi', errors);
        }

        let totalAmount = new Prisma.Decimal(0);
        const orderItemsData = input.items.map((reqItem) => {
          const product = productMap.get(BigInt(reqItem.product_id).toString())!;
          const unitPrice = new Prisma.Decimal(product.price);
          const subtotal = unitPrice.mul(reqItem.quantity);
          totalAmount = totalAmount.add(subtotal);

          return {
            product_id: product.id,
            quantity: reqItem.quantity,
            unit_price: unitPrice,
            subtotal,
          };
        });

        const datePrefix = now.toISOString().slice(0, 10).replace(/-/g, '');
        const randomPart = crypto.randomInt(1000, 9999);
        const orderNumber = `INV-${datePrefix}-${randomPart}-${Date.now().toString().slice(-4)}`;

        const order = await tx.order.create({
          data: {
            order_number: orderNumber,
            customer_id: input.customerId,
            created_by: input.userId,
            status: 'PENDING',
            total_amount: totalAmount,
            items: { create: orderItemsData },
          },
          include: {
            customer: true,
            items: { include: { product: true } },
          },
        });

        for (const pid of sortedProductIds) {
          const p = productMap.get(pid.toString())!;
          const qtyUsed = mergedQty.get(pid)!;
          const stockAfter = p.stock - qtyUsed;

          await tx.product.update({
            where: { id: pid },
            data: { stock: stockAfter },
          });

          await tx.stockMovement.create({
            data: {
              product_id: pid,
              type: 'ORDER_OUT',
              quantity_change: -qtyUsed,
              stock_after: stockAfter,
              reference_type: 'order',
              reference_id: order.id.toString(),
              note: `Reservasi order ${order.order_number}`,
              created_by: input.userId,
            },
          });

          if (stockAfter < p.low_stock_threshold) {
            lowStockEvents.push({
              productId: Number(pid),
              productCode: p.product_code,
              productName: p.product_name,
              stockAfter,
              threshold: p.low_stock_threshold,
            });
          }
        }

        const serialized = {
          success: true,
          message: 'Order berhasil dibuat',
          data: serializeBigInt(order),
        };

        await tx.idempotencyKey.update({
          where: { key: input.idempotencyKey },
          data: {
            status: 'COMPLETED',
            response_code: 201,
            response_body: serialized as unknown as Prisma.InputJsonValue,
          },
        });

        return serialized;
      });

      await redis.del('dashboard:summary').catch(() => undefined);
      for (const evt of lowStockEvents) {
        await rabbitMQ.publish('stock.low', evt);
      }

      return { statusCode: 201, body: responseBody };
    } catch (err) {
      await prisma.idempotencyKey.deleteMany({
        where: { key: input.idempotencyKey, status: 'PROCESSING' },
      });
      throw err;
    }
  }

  async transitionStatus(
    orderId: bigint,
    action: OrderAction,
    user: { id: bigint; role: Role },
    cancelReason?: string
  ) {
    const updatedOrder = await prisma.$transaction(async (tx) => {
      // Kunci baris order terlebih dahulu agar aman terhadap request cancel ganda (Double-Cancel Safe)
      const lockedOrders = await tx.$queryRaw<Array<{ id: bigint; status: OrderStatus; order_number: string }>>`
        SELECT id, status, order_number
        FROM orders
        WHERE id = ${orderId}
        FOR UPDATE
      `;

      if (lockedOrders.length === 0) {
        throw new AppError(404, 'Order tidak ditemukan');
      }

      const currentOrder = lockedOrders[0];
      const nextStatus = OrderStateMachine.validateTransition(
        currentOrder.status,
        action,
        user.role,
        cancelReason
      );

      const now = new Date();
      const updateData: Prisma.OrderUpdateInput = { status: nextStatus };

      if (nextStatus === 'PAID') updateData.paid_at = now;
      if (nextStatus === 'SHIPPED') updateData.shipped_at = now;
      if (nextStatus === 'COMPLETED') updateData.completed_at = now;
      if (nextStatus === 'CANCELLED') {
        updateData.cancelled_at = now;
        updateData.cancel_reason = cancelReason?.trim();

        const orderItems = await tx.orderItem.findMany({
          where: { order_id: orderId },
          orderBy: { product_id: 'asc' },
        });

        const productIds = Array.from(new Set(orderItems.map((i) => i.product_id))).sort((a, b) =>
          a < b ? -1 : a > b ? 1 : 0
        );

        const lockedProducts = await tx.$queryRaw<Array<{ id: bigint; stock: number }>>`
          SELECT id, stock
          FROM products
          WHERE id = ANY(${productIds}::bigint[])
          ORDER BY id ASC
          FOR UPDATE
        `;
        const stockMap = new Map(lockedProducts.map((p) => [p.id.toString(), p.stock]));

        for (const item of orderItems) {
          const curStock = stockMap.get(item.product_id.toString()) ?? 0;
          const newStock = curStock + item.quantity;
          stockMap.set(item.product_id.toString(), newStock);

          await tx.product.update({
            where: { id: item.product_id },
            data: { stock: newStock },
          });

          await tx.stockMovement.create({
            data: {
              product_id: item.product_id,
              type: 'CANCEL_RESTORE',
              quantity_change: item.quantity,
              stock_after: newStock,
              reference_type: 'order',
              reference_id: orderId.toString(),
              note: `Pengembalian stok pembatalan order ${currentOrder.order_number}: ${cancelReason}`,
              created_by: user.id,
            },
          });
        }
      }

      return tx.order.update({
        where: { id: orderId },
        data: updateData,
        include: {
          customer: true,
          items: { include: { product: true } },
        },
      });
    });

    await redis.del('dashboard:summary').catch(() => undefined);

    if (action === 'PAY') {
      await rabbitMQ.publish('order.paid', {
        orderId: Number(updatedOrder.id),
        orderNumber: updatedOrder.order_number,
      });
    }

    return updatedOrder;
  }
}

export const ordersService = new OrdersService();
