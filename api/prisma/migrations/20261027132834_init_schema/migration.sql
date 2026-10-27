-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'cashier');
CREATE TYPE "Gender" AS ENUM ('Pria', 'Wanita');
CREATE TYPE "OrderStatus" AS ENUM ('PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED');
CREATE TYPE "StockMovementType" AS ENUM ('INITIAL', 'ORDER_OUT', 'CANCEL_RESTORE', 'ADJUSTMENT');
CREATE TYPE "IdempotencyStatus" AS ENUM ('PROCESSING', 'COMPLETED');

-- CreateTable: users
CREATE TABLE "users" (
    "id" BIGSERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable: refresh_tokens
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "replaced_by_id" UUID,
    "revoked_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable: products (with CHECK constraints for stock >= 0 and price > 0)
CREATE TABLE "products" (
    "id" BIGSERIAL NOT NULL,
    "product_code" VARCHAR(50) NOT NULL,
    "product_name" VARCHAR(200) NOT NULL,
    "stock" INTEGER NOT NULL,
    "price" DECIMAL(12,2) NOT NULL,
    "low_stock_threshold" INTEGER NOT NULL DEFAULT 5,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "products_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_products_stock_non_negative" CHECK ("stock" >= 0),
    CONSTRAINT "chk_products_price_positive" CHECK ("price" > 0)
);

-- CreateTable: customers
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "customer_name" VARCHAR(150) NOT NULL,
    "customer_address" TEXT NOT NULL,
    "gender" "Gender" NOT NULL,
    "birth_date" DATE NOT NULL,
    "phone" VARCHAR(30),
    "email" VARCHAR(150),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "deleted_at" TIMESTAMP(3),
    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable: orders
CREATE TABLE "orders" (
    "id" BIGSERIAL NOT NULL,
    "order_number" VARCHAR(30) NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_by" BIGINT NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "total_amount" DECIMAL(14,2) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "shipped_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "cancel_reason" VARCHAR(255),
    "invoice_sent_at" TIMESTAMP(3),
    "order_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable: order_items (with CHECK constraint quantity > 0)
CREATE TABLE "order_items" (
    "id" BIGSERIAL NOT NULL,
    "order_id" BIGINT NOT NULL,
    "product_id" BIGINT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "subtotal" DECIMAL(14,2) NOT NULL,
    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_order_items_qty_positive" CHECK ("quantity" > 0)
);

-- CreateTable: stock_movements
CREATE TABLE "stock_movements" (
    "id" BIGSERIAL NOT NULL,
    "product_id" BIGINT NOT NULL,
    "type" "StockMovementType" NOT NULL,
    "quantity_change" INTEGER NOT NULL,
    "stock_after" INTEGER NOT NULL,
    "reference_type" VARCHAR(50),
    "reference_id" VARCHAR(50),
    "note" VARCHAR(255),
    "created_by" BIGINT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

-- CreateTable: idempotency_keys
CREATE TABLE "idempotency_keys" (
    "key" UUID NOT NULL,
    "user_id" BIGINT NOT NULL,
    "request_hash" VARCHAR(64) NOT NULL,
    "status" "IdempotencyStatus" NOT NULL DEFAULT 'PROCESSING',
    "response_code" INTEGER,
    "response_body" JSONB,
    "locked_until" TIMESTAMP(3) NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("key")
);

-- CreateIndexes
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "idx_refresh_tokens_user_id" ON "refresh_tokens"("user_id");
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");
CREATE INDEX "idx_products_active_name" ON "products"("deleted_at", "product_name");
CREATE INDEX "idx_customers_active_name" ON "customers"("deleted_at", "customer_name");
CREATE UNIQUE INDEX "orders_order_number_key" ON "orders"("order_number");
CREATE INDEX "idx_orders_date_status" ON "orders"("order_date", "status") INCLUDE ("total_amount");
CREATE INDEX "idx_orders_customer_date" ON "orders"("customer_id", "order_date" DESC);
CREATE INDEX "idx_order_items_order_id" ON "order_items"("order_id");
CREATE INDEX "idx_order_items_product_order" ON "order_items"("product_id", "order_id") INCLUDE ("quantity", "subtotal");
CREATE INDEX "idx_stock_movements_product_date" ON "stock_movements"("product_id", "created_at" DESC);
CREATE INDEX "idx_idempotency_expires" ON "idempotency_keys"("expires_at");

-- AddForeignKeys
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;