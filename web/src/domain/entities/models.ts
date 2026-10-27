export type UserRole = 'admin' | 'cashier';

export type OrderStatus = 'PENDING' | 'PAID' | 'SHIPPED' | 'COMPLETED' | 'CANCELLED';

export type OrderTransitionAction = 'pay' | 'ship' | 'complete' | 'cancel';

export type StockMovementType = 'INITIAL' | 'ORDER_OUT' | 'CANCEL_RESTORE' | 'ADJUSTMENT';

export interface AuthUser {
  id: number;
  name: string;
  email: string;
  role: UserRole;
}

export interface AuthSession {
  access_token: string;
  refresh_token: string;
  user: AuthUser;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  meta?: PaginationMeta;
  errors?: Record<string, string[]>;
}

export interface Product {
  id: number;
  product_code: string;
  product_name: string;
  stock: number;
  price: string | number;
  low_stock_threshold: number;
  created_at: string;
}

export interface Customer {
  id: string;
  customer_name: string;
  customer_address: string;
  gender: 'Pria' | 'Wanita';
  birth_date: string;
  phone: string | null;
  email: string | null;
}

export interface OrderItem {
  id: number;
  product_id: number;
  quantity: number;
  unit_price: string | number;
  subtotal: string | number;
  product: Product;
}

export interface Order {
  id: number;
  order_number: string;
  customer_id: string;
  status: OrderStatus;
  total_amount: string | number;
  paid_at: string | null;
  shipped_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  cancel_reason: string | null;
  order_date: string;
  customer: Customer;
  items: OrderItem[];
}

export interface StockMovement {
  id: number;
  product_id: number;
  type: StockMovementType;
  quantity_change: number;
  stock_after: number;
  reference_type: string | null;
  reference_id: string | null;
  note: string | null;
  created_at: string;
  creator: {
    id: number;
    name: string;
    email: string;
    role: UserRole;
  };
}

export interface DashboardSummary {
  total_revenue: number;
  total_paid_orders: number;
  orders_by_status: Record<string, number>;
  low_stock_products_count: number;
  generated_at: string;
}

export interface SalesReportRow {
  period: string;
  total_orders: number;
  total_revenue: number;
}

export interface TopProductRow {
  product_id: number;
  product_code: string;
  product_name: string;
  total_quantity: number;
  total_revenue: number;
}