export const swaggerDocument = {
  openapi: '3.0.0',
  info: {
    title: 'Azatech Online Shop — Order Management API',
    version: '1.0.0',
    description:
      'Dokumentasi API lengkap sistem Online Shop & Order Management (Technical Test PT Laksmada Aza Simetri). Dilengkapi dengan autentikasi JWT token rotation, RBAC (admin & cashier), stock ledger & pessimistic locking, RabbitMQ worker, serta pelaporan agregasi penjualan.',
    contact: {
      name: 'Azatech Engineering Team',
      email: 'admin@azatech.id',
    },
  },
  servers: [
    {
      url: '/api',
      description: 'API Base URL',
    },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Masukkan JWT Access Token. Format: Bearer <access_token>',
      },
    },
    schemas: {
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string', example: 'OK' },
          data: { type: 'object' },
          meta: {
            type: 'object',
            properties: {
              page: { type: 'integer', example: 1 },
              per_page: { type: 'integer', example: 10 },
              total: { type: 'integer', example: 50 },
              total_pages: { type: 'integer', example: 5 },
            },
          },
        },
      },
      LoginDto: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email', example: 'admin@azatech.id' },
          password: { type: 'string', example: 'Admin123!' },
        },
      },
      RefreshTokenDto: {
        type: 'object',
        required: ['refresh_token'],
        properties: {
          refresh_token: { type: 'string', example: 'd3b07384d113edec49eaa6238ad5ff00' },
        },
      },
      CustomerDto: {
        type: 'object',
        required: ['customer_name', 'customer_address'],
        properties: {
          customer_name: { type: 'string', example: 'Budi Santoso' },
          customer_address: { type: 'string', example: 'Jl. Sudirman No. 45, Jakarta Selatan' },
          email: { type: 'string', format: 'email', example: 'budi@example.com' },
          phone: { type: 'string', example: '081234567890' },
          birth_date: { type: 'string', format: 'date', example: '1995-08-17' },
        },
      },
      ProductDto: {
        type: 'object',
        required: ['product_code', 'product_name', 'price', 'stock'],
        properties: {
          product_code: { type: 'string', example: 'PRD-001' },
          product_name: { type: 'string', example: 'Kopi Arabika Gayo 250g' },
          price: { type: 'number', example: 85000 },
          stock: { type: 'integer', example: 100 },
          low_stock_threshold: { type: 'integer', example: 10 },
          is_active: { type: 'boolean', example: true },
        },
      },
      StockAdjustmentDto: {
        type: 'object',
        required: ['quantity_change', 'note'],
        properties: {
          quantity_change: { type: 'integer', example: 25, description: 'Perubahan kuantitas (positif untuk penambahan, negatif untuk pengurangan)' },
          note: { type: 'string', example: 'Restock mingguan dari supplier' },
        },
      },
      CreateOrderItemDto: {
        type: 'object',
        required: ['product_id', 'quantity'],
        properties: {
          product_id: { type: 'integer', example: 1 },
          quantity: { type: 'integer', example: 2 },
        },
      },
      CreateOrderDto: {
        type: 'object',
        required: ['customer_id', 'items'],
        properties: {
          customer_id: { type: 'string', format: 'uuid', example: 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d' },
          items: {
            type: 'array',
            items: { $ref: '#/components/schemas/CreateOrderItemDto' },
          },
        },
      },
      CancelOrderDto: {
        type: 'object',
        required: ['cancel_reason'],
        properties: {
          cancel_reason: { type: 'string', example: 'Permintaan pembatalan dari pembeli' },
        },
      },
    },
  },
  tags: [
    { name: 'Health & Observability', description: 'Pemeriksaan status konektivitas infrastruktur' },
    { name: 'Authentication', description: 'Autentikasi, JWT rotation, dan profil pengguna' },
    { name: 'Products & Stock', description: 'Manajemen katalog produk, audit stock ledger, dan stock adjustment' },
    { name: 'Customers', description: 'Direktori dan manajemen profil pelanggan' },
    { name: 'Orders & State Machine', description: 'Pemesanan atomik, transaksi state machine, invoice dan idempotency' },
    { name: 'Dashboard & Reports', description: 'Metrik agregasi penjualan dan top products' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Health & Observability'],
        summary: 'Periksa status kesehatan sistem (DB, Redis, RabbitMQ)',
        responses: {
          200: {
            description: 'Sistem berjalan sehat',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    success: { type: 'boolean', example: true },
                    data: {
                      type: 'object',
                      properties: {
                        status: { type: 'string', example: 'healthy' },
                        database: { type: 'string', example: 'up' },
                        redis: { type: 'string', example: 'up' },
                        rabbitmq: { type: 'string', example: 'up' },
                        timestamp: { type: 'string', example: '2026-10-28T07:50:00.000Z' },
                      },
                    },
                  },
                },
              },
            },
          },
          503: { description: 'Sistem mengalami gangguan infrastruktur' },
        },
      },
    },
    '/auth/login': {
      post: {
        tags: ['Authentication'],
        summary: 'Autentikasi pengguna & terbitkan JWT token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginDto' } } },
        },
        responses: {
          200: { description: 'Berhasil login, mengembalikan access_token dan refresh_token' },
          401: { description: 'Kredensial email atau password salah' },
        },
      },
    },
    '/auth/refresh': {
      post: {
        tags: ['Authentication'],
        summary: 'Rotasi access token menggunakan refresh token',
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenDto' } } },
        },
        responses: {
          200: { description: 'Token berhasil dirotasi' },
          401: { description: 'Refresh token tidak valid atau telah dicabut (revoked)' },
        },
      },
    },
    '/auth/logout': {
      post: {
        tags: ['Authentication'],
        summary: 'Cabut refresh token dan akhiri sesi',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/RefreshTokenDto' } } },
        },
        responses: {
          200: { description: 'Berhasil logout' },
        },
      },
    },
    '/auth/me': {
      get: {
        tags: ['Authentication'],
        summary: 'Dapatkan profil user yang sedang login',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Profil user saat ini' },
          401: { description: 'Unauthorized' },
        },
      },
    },
    '/products': {
      get: {
        tags: ['Products & Stock'],
        summary: 'Daftar katalog produk dengan paginasi, filter pencarian & urutan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['active', 'inactive', 'all'] } },
          { name: 'sort_by', in: 'query', schema: { type: 'string', default: 'created_at' } },
          { name: 'sort_dir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          200: { description: 'Daftar produk' },
        },
      },
      post: {
        tags: ['Products & Stock'],
        summary: 'Buat produk baru (Hanya Admin)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductDto' } } },
        },
        responses: {
          201: { description: 'Produk berhasil dibuat & ledger INITIAL tercatat' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
    },
    '/products/{id}': {
      get: {
        tags: ['Products & Stock'],
        summary: 'Detail produk berdasarkan ID',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Detail produk' },
          404: { description: 'Produk tidak ditemukan' },
        },
      },
      put: {
        tags: ['Products & Stock'],
        summary: 'Ubah informasi produk (Hanya Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/ProductDto' } } },
        },
        responses: {
          200: { description: 'Produk berhasil diubah' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
      delete: {
        tags: ['Products & Stock'],
        summary: 'Soft-delete produk (Hanya Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Produk berhasil dihapus secara soft-delete' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
    },
    '/products/{id}/stock-adjustments': {
      post: {
        tags: ['Products & Stock'],
        summary: 'Penyesuaian stok produk (Stock Opname) dengan Pessimistic Lock (Hanya Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/StockAdjustmentDto' } } },
        },
        responses: {
          200: { description: 'Penyesuaian stok berhasil dan tercatat di ledger' },
          422: { description: 'Pengurangan stok melebihi stok yang tersedia' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
    },
    '/products/{id}/stock-movements': {
      get: {
        tags: ['Products & Stock'],
        summary: 'Riwayat mutasi ledger stok produk (Hanya Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 20 } },
        ],
        responses: {
          200: { description: 'Daftar mutasi stok produk' },
        },
      },
    },
    '/customers': {
      get: {
        tags: ['Customers'],
        summary: 'Daftar direktori pelanggan dengan paginasi dan pencarian',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
          { name: 'sort_by', in: 'query', schema: { type: 'string', default: 'created_at' } },
          { name: 'sort_dir', in: 'query', schema: { type: 'string', enum: ['asc', 'desc'], default: 'desc' } },
        ],
        responses: {
          200: { description: 'Daftar pelanggan' },
        },
      },
      post: {
        tags: ['Customers'],
        summary: 'Tambah pelanggan baru (Admin & Kasir)',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerDto' } } },
        },
        responses: {
          201: { description: 'Pelanggan berhasil ditambahkan' },
        },
      },
    },
    '/customers/{id}': {
      get: {
        tags: ['Customers'],
        summary: 'Detail profil pelanggan',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Detail pelanggan' },
          404: { description: 'Pelanggan tidak ditemukan' },
        },
      },
      put: {
        tags: ['Customers'],
        summary: 'Ubah profil pelanggan (Admin & Kasir)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CustomerDto' } } },
        },
        responses: {
          200: { description: 'Profil pelanggan berhasil diperbarui' },
        },
      },
      delete: {
        tags: ['Customers'],
        summary: 'Hapus pelanggan (Khusus Admin — Kasir ditolak 403 Forbidden)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string', format: 'uuid' } }],
        responses: {
          200: { description: 'Pelanggan berhasil dihapus' },
          403: { description: 'Kasir tidak memiliki akses untuk menghapus pelanggan' },
        },
      },
    },
    '/orders': {
      get: {
        tags: ['Orders & State Machine'],
        summary: 'Daftar transaksi order dengan paginasi, filter status, tanggal, dan pelanggan',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'page', in: 'query', schema: { type: 'integer', default: 1 } },
          { name: 'per_page', in: 'query', schema: { type: 'integer', default: 10 } },
          { name: 'status', in: 'query', schema: { type: 'string', enum: ['PENDING', 'PAID', 'SHIPPED', 'COMPLETED', 'CANCELLED'] } },
          { name: 'customer_id', in: 'query', schema: { type: 'string', format: 'uuid' } },
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'search', in: 'query', schema: { type: 'string' } },
        ],
        responses: {
          200: { description: 'Daftar pesanan' },
        },
      },
      post: {
        tags: ['Orders & State Machine'],
        summary: 'Buat order baru secara atomik (Wajib Idempotency-Key & Pessimistic Lock)',
        security: [{ bearerAuth: [] }],
        parameters: [
          {
            name: 'Idempotency-Key',
            in: 'header',
            required: true,
            schema: { type: 'string', format: 'uuid' },
            description: 'UUID kunci idempotency unik untuk mencegah pemesanan ganda',
          },
        ],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CreateOrderDto' } } },
        },
        responses: {
          201: { description: 'Order berhasil dibuat dengan status PENDING' },
          422: { description: 'Stok tidak mencukupi atau payload tidak valid' },
          409: { description: 'Konflik idempotency key atau request sedang diproses' },
        },
      },
    },
    '/orders/{id}': {
      get: {
        tags: ['Orders & State Machine'],
        summary: 'Detail lengkap order beserta line items dan riwayat status',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Detail transaksi order' },
          404: { description: 'Order tidak ditemukan' },
        },
      },
    },
    '/orders/{id}/pay': {
      post: {
        tags: ['Orders & State Machine'],
        summary: 'Transisi State Machine: PENDING -> PAID (Admin & Kasir)',
        description: 'Memicu publikasi event RabbitMQ order.paid untuk pembuatan invoice dan pengiriman email konfirmasi',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Order berhasil dibayar (PAID)' },
          409: { description: 'Transisi status ilegal menurut state machine' },
        },
      },
    },
    '/orders/{id}/ship': {
      post: {
        tags: ['Orders & State Machine'],
        summary: 'Transisi State Machine: PAID -> SHIPPED (Hanya Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Order berhasil dikirim (SHIPPED)' },
          409: { description: 'Transisi status ilegal menurut state machine' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
    },
    '/orders/{id}/complete': {
      post: {
        tags: ['Orders & State Machine'],
        summary: 'Transisi State Machine: SHIPPED -> COMPLETED (Hanya Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        responses: {
          200: { description: 'Order telah selesai (COMPLETED)' },
          409: { description: 'Transisi status ilegal menurut state machine' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
    },
    '/orders/{id}/cancel': {
      post: {
        tags: ['Orders & State Machine'],
        summary: 'Batalkan order & kembalikan stok secara transaksional (Hanya Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'integer' } }],
        requestBody: {
          required: true,
          content: { 'application/json': { schema: { $ref: '#/components/schemas/CancelOrderDto' } } },
        },
        responses: {
          200: { description: 'Order berhasil dibatalkan dan stok dikembalikan (CANCEL_RESTORE)' },
          409: { description: 'Order tidak dapat dibatalkan dari status saat ini atau sudah dibatalkan' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
    },
    '/orders/{id}/invoice': {
      get: {
        tags: ['Orders & State Machine'],
        summary: 'Unduh / Pratinjau Invoice pembayaran order (HTML/PDF)',
        parameters: [
          { name: 'id', in: 'path', required: true, schema: { type: 'integer' } },
          { name: 'download', in: 'query', schema: { type: 'integer', enum: [0, 1] }, description: 'Set 1 untuk download file langsung sebagai attachment' },
          { name: 'token', in: 'query', schema: { type: 'string' }, description: 'JWT token otentikasi via URL parameter' },
        ],
        responses: {
          200: {
            description: 'Dokumen invoice HTML siap cetak / simpan PDF',
            content: { 'text/html': { schema: { type: 'string' } } },
          },
          401: { description: 'Unauthorized' },
          404: { description: 'Order tidak ditemukan' },
        },
      },
    },
    '/dashboard/summary': {
      get: {
        tags: ['Dashboard & Reports'],
        summary: 'Ringkasan KPI metrik dashboard (Total Omzet, Order per Status, Low Stock)',
        description: 'Data di-cache di Redis (TTL 5 menit) dan di-invalidate otomatis saat ada pesanan baru atau perubahan status',
        security: [{ bearerAuth: [] }],
        responses: {
          200: { description: 'Ringkasan data metrik dashboard' },
        },
      },
    },
    '/reports/sales': {
      get: {
        tags: ['Dashboard & Reports'],
        summary: 'Laporan agregasi penjualan harian & bulanan (Khusus Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'group_by', in: 'query', schema: { type: 'string', enum: ['day', 'month'], default: 'day' } },
        ],
        responses: {
          200: { description: 'Data deret waktu agregasi penjualan' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
    },
    '/reports/top-products': {
      get: {
        tags: ['Dashboard & Reports'],
        summary: 'Laporan produk terlaris berdasarkan kuantitas & omzet (Khusus Admin)',
        security: [{ bearerAuth: [] }],
        parameters: [
          { name: 'from', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'to', in: 'query', schema: { type: 'string', format: 'date' } },
          { name: 'limit', in: 'query', schema: { type: 'integer', default: 5 } },
        ],
        responses: {
          200: { description: 'Daftar produk terlaris' },
          403: { description: 'Hanya Admin yang diizinkan' },
        },
      },
    },
  },
};
