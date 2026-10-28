import { prisma } from '../../config/database';
import { AppError } from '../../common/errors';
import { Prisma } from '../../generated/prisma/client';

export interface CustomerQueryInput {
  page: number;
  perPage: number;
  search: string;
  sortBy: string;
  sortDir: 'asc' | 'desc';
}

export interface CustomerMutationDto {
  customer_name: string;
  customer_address: string;
  gender: 'Pria' | 'Wanita';
  birth_date: string;
  phone?: string | null;
  email?: string | null;
}

export class CustomersService {
  constructor(private readonly db: typeof prisma = prisma) {}

  async listCustomers(query: CustomerQueryInput) {
    const where: Prisma.CustomerWhereInput = {
      deleted_at: null,
      ...(query.search
        ? {
            OR: [
              { customer_name: { contains: query.search, mode: 'insensitive' } },
              { email: { contains: query.search, mode: 'insensitive' } },
              { phone: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [total, items] = await Promise.all([
      this.db.customer.count({ where }),
      this.db.customer.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortDir },
        skip: (query.page - 1) * query.perPage,
        take: query.perPage,
      }),
    ]);

    return {
      items,
      meta: {
        page: query.page,
        per_page: query.perPage,
        total,
        total_pages: Math.ceil(total / query.perPage),
      },
    };
  }

  async getCustomerById(customerId: string) {
    const customer = await this.db.customer.findFirst({
      where: { id: customerId, deleted_at: null },
    });
    if (!customer) {
      throw new AppError(404, 'Pelanggan tidak ditemukan');
    }
    return customer;
  }

  async createCustomer(dto: CustomerMutationDto) {
    return this.db.customer.create({
      data: {
        customer_name: dto.customer_name,
        customer_address: dto.customer_address,
        gender: dto.gender,
        birth_date: new Date(dto.birth_date),
        phone: dto.phone ?? null,
        email: dto.email ?? null,
      },
    });
  }

  async updateCustomer(customerId: string, dto: Partial<CustomerMutationDto>) {
    await this.getCustomerById(customerId);
    return this.db.customer.update({
      where: { id: customerId },
      data: {
        ...dto,
        ...(dto.birth_date ? { birth_date: new Date(dto.birth_date) } : {}),
      },
    });
  }

  async softDeleteCustomer(customerId: string): Promise<void> {
    await this.getCustomerById(customerId);
    await this.db.customer.update({
      where: { id: customerId },
      data: { deleted_at: new Date() },
    });
  }
}

export const customersService = new CustomersService();
