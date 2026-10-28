import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { Prisma } from '../../generated/prisma/client';

export interface ListProductsInput {
  page: number;
  perPage: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  isActive?: boolean;
}

export interface CreateProductDto {
  product_code: string;
  product_name: string;
  stock: number;
  price: number;
  low_stock_threshold?: number;
  is_active?: boolean;
}

export interface UpdateProductDto {
  product_code?: string;
  product_name?: string;
  price?: number;
  low_stock_threshold?: number;
  is_active?: boolean;
}

export interface StockAdjustDto {
  quantity_change: number;
  note: string;
}

export class ProductsService {
  async listProducts({ page, perPage, search, sortBy = 'created_at', sortDir = 'desc', isActive }: ListProductsInput) {
    const skip = (page - 1) * perPage;

    const where: Prisma.ProductWhereInput = {
      deleted_at: null,
    };

    if (isActive !== undefined) {
      where.is_active = isActive;
    }

    if (search && search.trim() !== '') {
      const q = search.trim();
      where.OR = [
        { product_name: { contains: q, mode: 'insensitive' } },
        { product_code: { contains: q, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.ProductOrderByWithRelationInput = {
      [sortBy]: sortDir,
    };

    const [total, items] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        skip,
        take: perPage,
        orderBy,
      }),
    ]);

    return {
      items,
      meta: {
        page,
        per_page: perPage,
        total,
        total_pages: Math.ceil(total / perPage),
      },
    };
  }

  async getProductById(id: bigint) {
    const product = await prisma.product.findFirst({
      where: {
        id,
        deleted_at: null,
      },
    });

    if (!product) {
      throw new AppError(404, 'Produk tidak ditemukan');
    }

    return product;
  }

  async createProduct(data: CreateProductDto, userId: bigint) {
    const existing = await prisma.product.findUnique({
      where: { product_code: data.product_code },
    });

    if (existing && !existing.deleted_at) {
      throw new AppError(409, `Kode produk '${data.product_code}' sudah digunakan`);
    }

    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          product_code: data.product_code,
          product_name: data.product_name,
          stock: data.stock,
          price: new Prisma.Decimal(data.price),
          low_stock_threshold: data.low_stock_threshold ?? 5,
          is_active: data.is_active ?? true,
        },
      });

      if (data.stock > 0) {
        await tx.stockMovement.create({
          data: {
            product_id: product.id,
            created_by: userId,
            type: 'INITIAL',
            quantity_change: data.stock,
            stock_after: data.stock,
            note: 'Stok awal produk baru',
          },
        });
      }

      return product;
    });
  }

  async updateProduct(id: bigint, data: UpdateProductDto) {
    const product = await this.getProductById(id);

    if (data.product_code && data.product_code !== product.product_code) {
      const existing = await prisma.product.findFirst({
        where: {
          product_code: data.product_code,
          id: { not: id },
          deleted_at: null,
        },
      });
      if (existing) {
        throw new AppError(409, `Kode produk '${data.product_code}' sudah digunakan produk lain`);
      }
    }

    return await prisma.product.update({
      where: { id },
      data: {
        ...(data.product_code && { product_code: data.product_code }),
        ...(data.product_name && { product_name: data.product_name }),
        ...(data.price !== undefined && { price: new Prisma.Decimal(data.price) }),
        ...(data.low_stock_threshold !== undefined && { low_stock_threshold: data.low_stock_threshold }),
        ...(data.is_active !== undefined && { is_active: data.is_active }),
      },
    });
  }

  async softDeleteProduct(id: bigint) {
    await this.getProductById(id);

    return await prisma.product.update({
      where: { id },
      data: {
        deleted_at: new Date(),
      },
    });
  }

  async adjustStock(id: bigint, data: StockAdjustDto, userId: bigint) {
    return await prisma.$transaction(async (tx) => {
      const product = await tx.product.findFirst({
        where: { id, deleted_at: null },
      });

      if (!product) {
        throw new AppError(404, 'Produk tidak ditemukan');
      }

      const newStock = product.stock + data.quantity_change;
      if (newStock < 0) {
        throw new AppError(
          400,
          `Stok tidak mencukupi untuk pengurangan ini (sisa stok: ${product.stock}, diminta: ${data.quantity_change})`
        );
      }

      const updated = await tx.product.update({
        where: { id },
        data: { stock: newStock },
      });

      const movement = await tx.stockMovement.create({
        data: {
          product_id: id,
          created_by: userId,
          type: 'ADJUSTMENT',
          quantity_change: data.quantity_change,
          stock_after: newStock,
          note: data.note,
        },
      });

      return {
        product: updated,
        stock_movement: movement,
      };
    });
  }

  async getStockMovements(id: bigint) {
    await this.getProductById(id);

    return await prisma.stockMovement.findMany({
      where: { product_id: id },
      orderBy: { created_at: 'desc' },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true,
          },
        },
      },
    });
  }
}

export const productsService = new ProductsService();
