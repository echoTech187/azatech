import { z } from 'zod';

export const orderFormSchema = z.object({
  customer_id: z.string().uuid('Pilih pelanggan yang valid'),
  items: z
    .array(
      z.object({
        product_id: z.number().int().positive('Pilih produk'),
        quantity: z.number().int().positive('Jumlah minimal 1'),
      })
    )
    .min(1, 'Minimal harus ada 1 baris produk'),
});

export type OrderFormValues = z.infer<typeof orderFormSchema>;

export const productCreateSchema = z.object({
  product_code: z.string().min(2, 'Kode produk minimal 2 karakter').max(50),
  product_name: z.string().min(2, 'Nama produk minimal 2 karakter').max(200),
  stock: z.number().int().min(0, 'Stok awal tidak boleh negatif'),
  price: z.number().positive('Harga produk harus lebih dari 0'),
  low_stock_threshold: z.number().int().min(0, 'Batas stok minimum tidak boleh negatif'),
});

export type ProductCreateValues = z.infer<typeof productCreateSchema>;

export const productUpdateSchema = productCreateSchema.omit({ stock: true }).partial();

export type ProductUpdateValues = z.infer<typeof productUpdateSchema>;

export const stockAdjustmentSchema = z.object({
  quantity_change: z
    .number()
    .int('Perubahan stok harus bilangan bulat')
    .refine((v) => v !== 0, 'Perubahan stok tidak boleh 0'),
  note: z
    .string()
    .min(3, 'Catatan stock opname wajib diisi (minimal 3 karakter)')
    .max(255, 'Catatan maksimal 255 karakter'),
});

export type StockAdjustmentValues = z.infer<typeof stockAdjustmentSchema>;

export const customerFormSchema = z.object({
  customer_name: z.string().min(2, 'Nama pelanggan minimal 2 karakter').max(150),
  customer_address: z.string().min(3, 'Alamat pelanggan minimal 3 karakter'),
  gender: z.enum(['Pria', 'Wanita']),
  birth_date: z.string().min(8, 'Tanggal lahir wajib diisi'),
  phone: z.string().max(30).nullable().optional(),
  email: z.string().email('Format email tidak valid').nullable().optional().or(z.literal('')),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;