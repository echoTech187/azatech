import { OrderStatus, Product, UserRole } from '../entities/models';

export interface OrderDraftItem {
  product_id: number;
  quantity: number;
}

/**
 * Menghitung estimasi total harga order secara real-time di sisi client
 * (Nilai otoritatif tetap dihitung ulang oleh server saat transaksi).
 */
export function calculateOrderDraftTotal(
  rows: OrderDraftItem[],
  productMap: Map<number, Product>
): number {
  return rows.reduce((acc, row) => {
    const product = productMap.get(row.product_id);
    const unitPrice = product ? Number(product.price) : 0;
    const validQty = row.quantity > 0 ? row.quantity : 0;
    return acc + unitPrice * validQty;
  }, 0);
}

/**
 * Mengecek apakah stok produk berada di bawah batas minimum (low_stock_threshold).
 */
export function isProductLowStock(product: { stock: number | string; low_stock_threshold: number | string }): boolean {
  const stock = Number(product.stock) || 0;
  const threshold = Number(product.low_stock_threshold) || 0;
  return stock <= threshold;
}

/**
 * Matriks aturan bisnis State Machine & RBAC untuk menentukan tombol aksi
 * apa saja yang boleh ditampilkan pada halaman Detail Order.
 */
export function getOrderActionPermissions(status: OrderStatus, role?: UserRole | null) {
  const isAdmin = role === 'admin';
  const isCashierOrAdmin = role === 'admin' || role === 'cashier';

  return {
    canPay: isCashierOrAdmin && status === 'PENDING',
    canShip: isAdmin && status === 'PAID',
    canComplete: isAdmin && status === 'SHIPPED',
    canCancel: isAdmin && (status === 'PENDING' || status === 'PAID'),
    canDownloadInvoice: ['PAID', 'SHIPPED', 'COMPLETED'].includes(status),
  };
}

/**
 * Helper pemformatan mata uang Rupiah standar Indonesia.
 */
export function formatIDR(value: string | number): string {
  return `Rp ${Number(value).toLocaleString('id-ID')}`;
}
