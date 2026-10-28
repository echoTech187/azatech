import { Product } from '../entities/models';

/**
 * Format angka atau string ke mata uang Rupiah standar (contoh: Rp 50.000)
 */
export function formatIDR(amount: number | string): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return 'Rp 0';
  return `Rp ${Math.round(num).toLocaleString('id-ID')}`;
}

/**
 * Cek apakah stok produk berada pada atau di bawah ambang batas minimum
 */
export function isProductLowStock(product: { stock: number | string; low_stock_threshold: number | string }): boolean {
  const stock = Number(product.stock) || 0;
  const threshold = Number(product.low_stock_threshold) || 0;
  return stock <= threshold;
}
