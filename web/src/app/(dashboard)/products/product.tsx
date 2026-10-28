'use client';


import React, { useState } from 'react';
import { Product } from '@/src/domain/entities/models';
import { formatIDR, isProductLowStock } from '@/src/domain/rules/order-rules';
import { useAuth } from '@/src/application/hooks/use-auth';
import { useUrlQuerySync } from '@/src/application/hooks/use-url-query-sync';
import {
  useProductsQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useStockLedgerQuery,
  useStockAdjustmentMutation,
} from '@/src/application/hooks/use-products';


export default function ProductsPage() {
  const { isAdmin } = useAuth();
  const { searchParams, updateUrlParams } = useUrlQuerySync();


  const page = Number(searchParams.get('page') ?? '1');
  const search = searchParams.get('search') ?? '';
  const sortBy = searchParams.get('sort_by') ?? 'created_at';
  const sortDir = searchParams.get('sort_dir') ?? 'desc';


  const [searchInput, setSearchInput] = useState(search);


  // State CRUD Produk (Tambah / Edit - Khusus Admin)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [productCode, setProductCode] = useState('');
  const [productName, setProductName] = useState('');
  const [initialStock, setInitialStock] = useState<number>(10);
  const [price, setPrice] = useState<number>(15000);
  const [lowThreshold, setLowThreshold] = useState<number>(5);
  const [formError, setFormError] = useState<string | null>(null);


  // State Stock Opname & Ledger
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [qtyChange, setQtyChange] = useState<number>(0);
  const [adjustNote, setAdjustNote] = useState<string>('');


  const { data, isLoading, isError } = useProductsQuery({
    page,
    per_page: 10,
    search,
    sort_by: sortBy,
    sort_dir: sortDir,
  });


  const createProductMutation = useCreateProductMutation();
  const updateProductMutation = useUpdateProductMutation();
  const deleteProductMutation = useDeleteProductMutation();


  const { data: ledgerData } = useStockLedgerQuery(selectedProduct?.id ?? null);
  const adjustMutation = useStockAdjustmentMutation(selectedProduct?.id ?? null);


  const resetProductForm = () => {
    setEditingProduct(null);
    setProductCode('');
    setProductName('');
    setInitialStock(10);
    setPrice(15000);
    setLowThreshold(5);
    setFormError(null);
  };


  const handleStartEdit = (p: Product) => {
    setEditingProduct(p);
    setProductCode(p.product_code);
    setProductName(p.product_name);
    setPrice(Number(p.price));
    setLowThreshold(p.low_stock_threshold);
    setFormError(null);
  };


  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    try {
      if (editingProduct) {
        await updateProductMutation.mutateAsync({
          productId: editingProduct.id,
          payload: {
            product_code: productCode,
            product_name: productName,
            price,
            low_stock_threshold: lowThreshold,
          },
        });
      } else {
        await createProductMutation.mutateAsync({
          product_code: productCode,
          product_name: productName,
          stock: initialStock,
          price,
          low_stock_threshold: lowThreshold,
        });
      }
      resetProductForm();
    } catch (err: any) {
      setFormError(err?.response?.data?.message ?? 'Gagal menyimpan data produk');
    }
  };


  return (
    <main className="max-w-7xl mx-auto p-6 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-slate-900">Katalog Produk & Manajemen Stok</h1>


        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateUrlParams({ search: searchInput, page: '1' });
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Cari kode atau nama produk..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          />
          <select
            value={`${sortBy}:${sortDir}`}
            onChange={(e) => {
              const [sb, sd] = e.target.value.split(':');
              updateUrlParams({ sort_by: sb, sort_dir: sd, page: '1' });
            }}
            className="border border-slate-300 rounded px-3 py-1.5 text-sm"
          >
            <option value="created_at:desc">Terbaru</option>
            <option value="product_name:asc">Nama (A-Z)</option>
            <option value="price:asc">Harga Terendah</option>
            <option value="price:desc">Harga Tertinggi</option>
            <option value="stock:asc">Stok Paling Sedikit</option>
          </select>
          <button
            type="submit"
            className="bg-slate-900 text-white px-4 py-1.5 rounded text-sm font-medium"
          >
            Terapkan
          </button>
        </form>
      </div>


      {/* Form Tambah / Edit Produk (Khusus Admin) */}
      {isAdmin && (
        <form
          onSubmit={handleSaveProduct}
          className="bg-white p-4 rounded-lg shadow border space-y-3"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-800">
              {editingProduct
                ? `Edit Produk: ${editingProduct.product_code}`
                : 'Tambah Produk Baru (Otomatis Mencatat Ledger INITIAL)'}
            </h2>
            {editingProduct && (
              <button
                type="button"
                onClick={resetProductForm}
                className="text-xs text-slate-500 hover:text-slate-800"
              >
                Batal Edit
              </button>
            )}
          </div>


          <div className="grid grid-cols-1 md:grid-cols-6 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium mb-1">Kode Produk</label>
              <input
                type="text"
                required
                placeholder="P0051"
                value={productCode}
                onChange={(e) => setProductCode(e.target.value)}
                className="border rounded px-2.5 py-1.5 text-sm w-full"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium mb-1">Nama Produk</label>
              <input
                type="text"
                required
                placeholder="Nama produk..."
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                className="border rounded px-2.5 py-1.5 text-sm w-full"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Harga (Rp)</label>
              <input
                type="number"
                required
                min={1}
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                className="border rounded px-2.5 py-1.5 text-sm w-full"
              />
            </div>
            {!editingProduct ? (
              <div>
                <label className="block text-xs font-medium mb-1">Stok Awal</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={initialStock}
                  onChange={(e) => setInitialStock(Number(e.target.value))}
                  className="border rounded px-2.5 py-1.5 text-sm w-full"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-medium mb-1">Batas Stok Min.</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={lowThreshold}
                  onChange={(e) => setLowThreshold(Number(e.target.value))}
                  className="border rounded px-2.5 py-1.5 text-sm w-full"
                />
              </div>
            )}
            <button
              type="submit"
              disabled={createProductMutation.isPending || updateProductMutation.isPending}
              className="bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 px-4 rounded text-sm font-semibold"
            >
              {editingProduct ? 'Simpan Perubahan' : '+ Tambah Produk'}
            </button>
          </div>


          {formError && (
            <p role="alert" className="text-xs text-rose-600 font-medium">
              {formError}
            </p>
          )}
        </form>
      )}


      {isLoading && <p className="text-sm text-slate-500">Memuat data produk...</p>}
      {isError && <p className="text-sm text-rose-600">Gagal memuat daftar produk.</p>}


      {data && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 text-slate-700 border-b">
              <tr>
                <th className="p-3">Kode</th>
                <th className="p-3">Nama Produk</th>
                <th className="p-3 text-right">Harga</th>
                <th className="p-3 text-center">Stok</th>
                <th className="p-3 text-center">Batas Minimum</th>
                {isAdmin && <th className="p-3 text-right">Aksi (Admin)</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.data.map((p: any) => {
                const isLow = isProductLowStock(p);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="p-3 font-mono font-medium">{p.product_code}</td>
                    <td className="p-3">{p.product_name}</td>
                    <td className="p-3 text-right">{formatIDR(p.price)}</td>
                    <td className="p-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-bold ${
                          isLow ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'
                        }`}
                      >
                        {p.stock}
                      </span>
                    </td>
                    <td className="p-3 text-center text-slate-500">{p.low_stock_threshold}</td>
                    {isAdmin && (
                      <td className="p-3 text-right space-x-2">
                        <button
                          type="button"
                          onClick={() => setSelectedProduct(p)}
                          className="text-xs bg-slate-800 hover:bg-slate-700 text-white px-2.5 py-1 rounded"
                        >
                          Opname & Ledger
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStartEdit(p)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-semibold"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteProductMutation.mutate(p.id)}
                          className="text-xs text-rose-600 hover:text-rose-800 font-semibold"
                        >
                          Hapus
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>


          {data.meta && (
            <div className="p-4 border-t flex items-center justify-between text-xs text-slate-600">
              <span>
                Halaman {data.meta.page} dari {data.meta.total_pages} (Total {data.meta.total} produk)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => updateUrlParams({ page: String(page - 1) })}
                  className="px-3 py-1 border rounded disabled:opacity-40"
                >
                  Sebelumnya
                </button>
                <button
                  type="button"
                  disabled={page >= data.meta.total_pages}
                  onClick={() => updateUrlParams({ page: String(page + 1) })}
                  className="px-3 py-1 border rounded disabled:opacity-40"
                >
                  Berikutnya
                </button>
              </div>
            </div>
          )}
        </div>
      )}


      {selectedProduct && isAdmin && (
        <div className="bg-white p-6 rounded-lg shadow border space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">
              Stock Opname & Ledger: {selectedProduct.product_code} - {selectedProduct.product_name}
            </h2>
            <button
              type="button"
              onClick={() => setSelectedProduct(null)}
              className="text-sm text-slate-500 hover:text-slate-800"
            >
              Tutup [X]
            </button>
          </div>


          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await adjustMutation.mutateAsync({
                quantity_change: qtyChange,
                note: adjustNote,
              });
              setQtyChange(0);
              setAdjustNote('');
            }}
            className="flex flex-wrap items-end gap-3 bg-slate-50 p-4 rounded border"
          >
            <div>
              <label className="block text-xs font-medium mb-1">Perubahan Stok (+/-)</label>
              <input
                type="number"
                value={qtyChange}
                onChange={(e) => setQtyChange(Number(e.target.value))}
                className="border rounded px-3 py-1.5 text-sm w-32"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs font-medium mb-1">Catatan Wajib (Stock Opname)</label>
              <input
                type="text"
                required
                placeholder="Mis: Penyesuaian stok opname gudang bulanan"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="border rounded px-3 py-1.5 text-sm w-full"
              />
            </div>
            <button
              type="submit"
              disabled={adjustMutation.isPending}
              className="bg-emerald-600 text-white px-4 py-1.5 rounded text-sm font-semibold"
            >
              Simpan Adjustment
            </button>
          </form>


          <div className="max-h-64 overflow-y-auto border rounded">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 border-b">
                <tr>
                  <th className="p-2">Waktu</th>
                  <th className="p-2">Tipe</th>
                  <th className="p-2 text-right">Perubahan</th>
                  <th className="p-2 text-right">Stok Akhir</th>
                  <th className="p-2">Catatan</th>
                  <th className="p-2">Oleh</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {ledgerData?.map((m: any) => (
                  <tr key={m.id}>
                    <td className="p-2">{new Date(m.created_at).toLocaleString('id-ID')}</td>
                    <td className="p-2 font-mono font-semibold">{m.type}</td>
                    <td
                      className={`p-2 text-right font-bold ${
                        m.quantity_change >= 0 ? 'text-emerald-600' : 'text-rose-600'
                      }`}
                    >
                      {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                    </td>
                    <td className="p-2 text-right font-semibold">{m.stock_after}</td>
                    <td className="p-2">{m.note ?? '-'}</td>
                    <td className="p-2">{m.creator?.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </main>
  );
}
