# Sistem Online Shop (Order Management) — Senior Fullstack Technical Test

[![CI Status](https://github.com/echoTech187/azatech/actions/workflows/ci.yml/badge.svg)](https://github.com/echoTech187/azatech/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-Strict%20Mode-blue)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)

Solusi *production-grade* untuk pengelolaan produk, pelanggan, stok ledger, dan order multi-item dengan jaminan konsistensi konkurensi tinggi, idempotency berbasis PostgreSQL, background job asinkron via RabbitMQ, serta antarmuka modern Next.js 15.

---

## 1. Tech Stack & Keputusan Arsitektur (Track A)

- **Backend API**: **Node.js 24 LTS + Express.js + TypeScript (`strict: true`)**
  - Arsitektur modular per fitur dengan pemisahan layer controller, domain service, dan persistence.
  - Standarisasi response helper, UUID `X-Request-Id` tracing, Pino JSON structured logging, dan error handler seragam.
  - Rate limiting per endpoint dan router untuk mencegah DoS dan *brute-force*.
- **ORM & Database**: **Prisma ORM + PostgreSQL 16**
  - Transaksi ACID terisolasi menggunakan *Pessimistic Row-Level Locking* (`SELECT ... FOR UPDATE` dengan pengurutan ID terurut) untuk mencegah *deadlock* dan *overselling*.
  - Integritas data dilindungi PostgreSQL constraints: `CHECK (stock >= 0)`, `CHECK (price > 0)`, dan `CHECK (quantity > 0)`.
  - Covering indexes pada kolom pencarian dan agregasi laporan historis 90 hari.
- **Message Broker & Cache**:
  - **RabbitMQ 3 (`amqplib` + Dead-Letter Exchange)**: Memproses background jobs secara andal (pembuatan invoice PDF/HTML, pengiriman email SMTP via Mailpit, dan alert stok menipis) dengan *exponential backoff retry* (5s, 25s, 125s).
  - **Redis 7**: Digunakan untuk in-memory cache `/api/dashboard/summary` (TTL 5 menit) dengan mekanisme *proactive cache invalidation* saat transaksi order/stok terjadi, serta rate limiting terdistribusi.
- **Frontend Web App**: **Next.js 15 (App Router, React 19) + TypeScript + Tailwind CSS + TanStack Query + Zod**
  - Berjalan sebagai service terpisah (`web`), berinteraksi murni via REST API ke container `api`.
  - Sinkronisasi penuh tabel, pencarian debounced, sorting, dan pagination ke URL query string (`?page=1&per_page=10&search=...`).
  - Axios response interceptor dengan antrean (*mutex*) untuk otomatis memperbarui *access token* via `POST /api/auth/refresh` tanpa memutus alur pengguna.
  - Form order dinamis dengan auto-generate UUID `Idempotency-Key` dan pemetaan error stok spesifik per baris produk (`errors["items.N.quantity"]`).
- **Observability & Dokumentasi**:
  - `/api/health`: Memeriksa status kesehatan koneksi PostgreSQL, Redis, dan RabbitMQ.
  - `/api/docs`: Dokumentasi interaktif OpenAPI 3 (Swagger UI).
- **Automated Testing**:
  - **Vitest**: Unit testing domain `OrderStateMachine`, integration testing RBAC & double-cancel protection, dan concurrency testing (20 concurrent requests pada stok 5) + idempotency key verification.

---

## 2. Quick Start (1 Perintah Docker Compose)

### Prasyarat
- Docker Engine 24+ & Docker Compose v2+
- Port yang tersedia: `3000` (Web), `4000` (API), `5432` (Postgres), `6379` (Redis), `5672`/`15672` (RabbitMQ), `8025` (Mailpit).

### Langkah Menjalankan
1. Clone repository dan salin environment file:
   ```bash
   git clone https://github.com/echoTech187/azatech.git
   cd azatech
   cp .env.example .env
   ```

2. Jalankan seluruh stack dengan Docker Compose:
   ```bash
   docker compose up --build -d
   ```
   *Container `api` akan otomatis menjalankan migrasi skema Prisma, constraint PostgreSQL, dan database seeder 90 hari terakhir saat booting pertama kali.*

3. Akses layanan:
   - **Frontend Web App**: [http://localhost:3000](http://localhost:3000)
   - **Backend API Base**: [http://localhost:4000/api](http://localhost:4000/api)
   - **OpenAPI 3 / Swagger UI**: [http://localhost:4000/api/docs](http://localhost:4000/api/docs)
   - **Health Check Endpoint**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
   - **Mailpit Web UI (Cek Email Invoice & Alert)**: [http://localhost:8025](http://localhost:8025)
   - **RabbitMQ Management UI**: [http://localhost:15672](http://localhost:15672) (User/Pass: `guest`/`guest`)

---

## 3. Akun Login Demo (Hasil Seeder)

Database seeder secara otomatis menyediakan 2 akun siap pakai dengan hak akses berbeda:

| Role | Email | Password | Hak Akses Utama |
|---|---|---|---|
| **Admin** | `ekosuesanto25@gmail.com` | `Azatech@2026!` | Akses penuh: CRUD Produk, Stock Adjustment & Ledger, CRUD & Hapus Pelanggan, Buat Order, Transisi `PAID`/`SHIPPED`/`COMPLETED`/`CANCELLED`, Laporan Omzet Penjualan |
| **Cashier** | `rishamoena23@gmail.com` | `Azatech@2026!` | Katalog Produk, Tambah & Edit Pelanggan (dilarang menghapus — ditolak `403`), Buat Order, Tandai Order `PAID`, Unduh Invoice |

---

## 4. Cara Menjalankan Automated Tests

Seluruh pengujian berjalan terhadap database PostgreSQL dan broker RabbitMQ/Redis sungguhan guna memverifikasi perilaku konkurensi baris (`SELECT ... FOR UPDATE`) secara presisi:

```bash
# Menjalankan seluruh test backend (Unit, RBAC, Concurrency 20 Request, Idempotency)
cd api
npm test
```

### Rincian Test Cases yang Dicakup:
- **`tests/unit/order-state-machine.test.ts`**:
  - Validasi transisi status legal (`PENDING` -> `PAID` -> `SHIPPED` -> `COMPLETED`).
  - Penolakan transisi ilegal (`PENDING` langsung ke `COMPLETED` menghasilkan `409 Conflict`).
  - Kewajiban mencantumkan `cancel_reason` saat pembatalan order.
- **`tests/integration/concurrency-and-idempotency.test.ts`**:
  - **Uji Konkurensi**: Menjalankan 20 request order paralel via `Promise.all` terhadap produk dengan sisa stok 5. Menghasilkan tepat 5 transaksi sukses (`201 Created`), 15 transaksi ditolak (`422 Unprocessable Entity`), dan sisa stok akhir tepat `0`.
  - **Uji Idempotensi**: Mengirim request berulang dengan `Idempotency-Key` dan payload yang sama mengembalikan respons identik tanpa memotong stok dua kali. Mengirim request dengan key yang sama namun payload berbeda langsung ditolak `422`.
- **`tests/integration/rbac-and-double-cancel.test.ts`**:
  - **Uji RBAC**: Memverifikasi bahwa role `cashier` ditolak dengan `403 Forbidden` saat mencoba menghapus pelanggan atau membatalkan order.
  - **Double-Cancel Protection**: Membatalkan order yang sama dua kali berturut-turut tidak mengembalikan stok ganda.

---

## 5. Ringkasan Endpoint API Utama

| Modul | Method | Endpoint | Role | Deskripsi |
|---|---|---|---|---|
| **Health** | `GET` | `/api/health` | Public | Status koneksi DB, Redis, RabbitMQ |
| **Docs** | `GET` | `/api/docs` | Public | Dokumentasi interaktif Swagger UI |
| **Auth** | `POST` | `/api/auth/login` | Public | Login pengguna, menghasilkan access & refresh token |
| | `POST` | `/api/auth/refresh` | Public | Rotasi token dengan deteksi pencurian token |
| | `POST` | `/api/auth/logout` | Authenticated | Revoke refresh token aktif |
| | `GET` | `/api/auth/me` | Authenticated | Profil user yang sedang login |
| **Products** | `GET` | `/api/products` | Authenticated | Pagination, search, sort katalog produk |
| | `POST` | `/api/products` | `admin` | Tambah produk baru (catat stock movement INITIAL) |
| | `GET` | `/api/products/:id` | Authenticated | Detail produk |
| | `PUT` | `/api/products/:id` | `admin` | Update produk |
| | `DELETE`| `/api/products/:id` | `admin` | Soft delete produk |
| | `POST` | `/api/products/:id/stock-adjustments` | `admin` | Stock adjustment dengan validasi stok & audit log |
| | `GET` | `/api/products/:id/stock-movements` | `admin` | Riwayat audit ledger pergerakan stok produk |
| **Customers**| `GET` | `/api/customers` | Authenticated | Daftar pelanggan dengan pagination & search |
| | `POST` | `/api/customers` | `admin`, `cashier` | Tambah pelanggan baru |
| | `PUT` | `/api/customers/:id` | `admin`, `cashier` | Update data pelanggan |
| | `DELETE`| `/api/customers/:id` | `admin` (**Cashier 403**)| Hapus pelanggan (soft delete) |
| **Orders** | `GET` | `/api/orders` | Authenticated | Daftar transaksi order dengan pagination & filter status |
| | `POST` | `/api/orders` | `admin`, `cashier` | Buat order baru dengan atomic lock & Idempotency-Key |
| | `GET` | `/api/orders/:id` | Authenticated | Detail order dan item |
| | `POST` | `/api/orders/:id/pay` | `admin`, `cashier` | Tandai bayar (`PAID`), trigger async invoice generation |
| | `POST` | `/api/orders/:id/ship` | `admin` | Tandai pengiriman barang (`SHIPPED`) |
| | `POST` | `/api/orders/:id/complete` | `admin` | Tandai order selesai (`COMPLETED`) |
| | `POST` | `/api/orders/:id/cancel` | `admin` | Batalkan order (kembalikan stok secara transaksional) |
| | `GET` | `/api/orders/:id/invoice` | Authenticated | Unduh atau lihat dokumen invoice resmi |
| **Reports** | `GET` | `/api/dashboard/summary` | Authenticated | Kartu metrik total omzet & status order (Redis cached) |
| | `GET` | `/api/reports/sales` | `admin` | Agregasi SQL penjualan per hari / bulan |
| | `GET` | `/api/reports/top-products` | `admin` | Agregasi SQL produk terlaris |

---

## 6. AI Usage Disclosure

Sesuai dengan ketentuan transparansi pengerjaan:
- **Tools AI yang digunakan**: Antigravity Assistant (Google DeepMind).
- **Bagian yang dibantu oleh AI**:
  - Penyusunan kerangka dokumen arsitektur komprehensif (`ARCHITECTURE.md`), perumusan diagram Mermaid, dan perumusan Architecture Decision Records (ADR).
  - Skrip seeder data realistis 50 produk, 30 pelanggan, dan 150 transaksi order selama 90 hari terakhir.
  - Pembuatan skema Swagger / OpenAPI 3.0 specification yang mencakup seluruh endpoint.
- **Verifikasi**: Seluruh logika bisnis inti (mekanisme *pessimistic locking*, pencegahan *deadlock*, pengelolaan *idempotency key*, *order state machine*, dan aturan otorisasi RBAC) telah diuji dan divalidasi 100% menggunakan automated integration testing suite.

---

## 7. Rencana Pengembangan Lanjutan (Future Work)

1. **Transactional Outbox Pattern**: Mengintegrasikan Debezium CDC untuk menjamin pengiriman pesan event ke RabbitMQ 100% atomik terhadap komit database PostgreSQL.
2. **End-to-End Testing**: Menambahkan skenario uji interaksi browser menyeluruh menggunakan Playwright di pipeline CI.
3. **Multi-Branch Inventory Partitioning**: Memisahkan stok per cabang guna mendukung pertumbuhan hingga 50.000 order per hari.
