'use client';

import React, { useState, useEffect } from 'react';
import MasterTabShell from '@/src/presentation/components/MasterTabShell';
import ResponsiveModal from '@/src/presentation/components/ResponsiveModal';
import Select2CustomDropdown from '@/src/presentation/components/Select2CustomDropdown';
import {
    getMasterProductsAction,
    createMasterProductAction,
    updateMasterProductAction,
    deleteMasterProductAction,
    adjustProductStockAction,
    getProductStockMovementsAction,
} from '@/src/actions/product.actions';
import { Product, PaginationMeta, StockMovement } from '@/src/domain/entities/models';
import { formatIDR, isProductLowStock } from '@/src/domain/rules/order-rules';
import { useAuth } from '@/src/application/hooks/use-auth';

export interface ProductFormData {
    id?: number | string;
    product_code?: string;
    product_name?: string;
    stock?: number | string;
    price?: number | string;
    low_stock_threshold?: number | string;
    is_active?: boolean;
    created_at?: string;
    [key: string]: any;
}

export default function ProductPage() {
    const { isAdmin } = useAuth();

    // State Master Produk
    const [dataList, setDataList] = useState<Product[]>([]);
    const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
    const [loading, setLoading] = useState(false);
    const [pagination, setPagination] = useState({ page: 1, limit: 10 });
    const [filter, setFilter] = useState<{ search: string; status: 'all' | 'active' | 'inactive' }>({
        search: '',
        status: 'all',
    });
    const [sort, setSort] = useState<{ field: string; order: string }>({ field: 'created_at', order: 'desc' });

    // State Stock Opname & Ledger (Khusus Admin)
    const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
    const [qtyChange, setQtyChange] = useState<number>(0);
    const [adjustNote, setAdjustNote] = useState<string>('');
    const [adjustLoading, setAdjustLoading] = useState(false);
    const [ledgerData, setLedgerData] = useState<StockMovement[]>([]);
    const [ledgerLoading, setLedgerLoading] = useState(false);

    const loadData = async (
        targetPage?: number,
        targetLimit?: number,
        targetSearch?: string,
        targetStatus?: 'all' | 'active' | 'inactive',
        targetSort?: { field: string; order: string }
    ) => {
        setLoading(true);
        try {
            const pageParam = targetPage ?? pagination.page;
            const limitParam = targetLimit ?? pagination.limit;
            const searchParam = targetSearch !== undefined ? targetSearch : filter.search;
            const statusParam = targetStatus !== undefined ? targetStatus : filter.status;
            const sortParam = targetSort ?? sort;

            const res = await getMasterProductsAction(
                { page: pageParam, limit: limitParam },
                { search: searchParam, status: statusParam },
                sortParam
            );
            if (res?.success) {
                if (res.data) setDataList(res.data);
                if (res.meta) {
                    setMeta(res.meta);
                    setPagination({ page: res.meta.page, limit: res.meta.per_page });
                }
            }
        } catch (err) {
            console.warn('Gagal memuat Produk:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSortChange = (combinedValue: string) => {
        const [field, order] = combinedValue.split(':');
        const newSort = { field, order };
        setSort(newSort);
        loadData(1, pagination.limit, filter.search, filter.status, newSort);
    };

    useEffect(() => {
        loadData();
    }, []);

    // Load ledger movements when a product is selected for opname
    const handleOpenOpname = async (product: Product) => {
        setSelectedProduct(product);
        setQtyChange(0);
        setAdjustNote('');
        setLedgerLoading(true);
        try {
            const res = await getProductStockMovementsAction(product.id);
            if (res?.success && res.data) {
                setLedgerData(res.data);
            }
        } catch (err) {
            console.error('Gagal memuat riwayat mutasi stok:', err);
        } finally {
            setLedgerLoading(false);
        }
    };

    // Submit Stock Adjustment
    const handleSaveAdjustment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProduct) return;
        if (qtyChange === 0) {
            alert('Perubahan stok tidak boleh 0!');
            return;
        }
        if (!adjustNote.trim() || adjustNote.trim().length < 3) {
            alert('Catatan Stock Opname wajib diisi minimal 3 karakter!');
            return;
        }

        setAdjustLoading(true);
        try {
            const res = await adjustProductStockAction(selectedProduct.id, {
                quantity_change: qtyChange,
                note: adjustNote.trim(),
            });

            if (res?.success) {
                alert(`✓ Penyesuaian stok berhasil disimpan! Stok baru: ${res.data?.product?.stock ?? selectedProduct.stock + qtyChange}`);
                setQtyChange(0);
                setAdjustNote('');

                // Update selected product stock locally
                if (res.data?.product) {
                    setSelectedProduct(res.data.product);
                }

                // Refetch ledger & main products list
                const movementsRes = await getProductStockMovementsAction(selectedProduct.id);
                if (movementsRes?.success && movementsRes.data) {
                    setLedgerData(movementsRes.data);
                }
                await loadData();
            } else {
                alert(res?.error || 'Gagal menyimpan penyesuaian stok.');
            }
        } catch (err: any) {
            const errMsg = err?.response?.data?.message || err?.message || 'Gagal menyimpan penyesuaian stok.';
            alert(errMsg);
        } finally {
            setAdjustLoading(false);
        }
    };

    const handleCreate = async (formData: ProductFormData) => {
        if (!formData.product_code?.trim() || !formData.product_name?.trim()) {
            alert('Kode Produk dan Nama Produk wajib diisi!');
            return false;
        }

        const payload = {
            product_code: String(formData.product_code).trim().toUpperCase(),
            product_name: String(formData.product_name).trim(),
            stock: Math.max(0, parseInt(String(formData.stock), 10) || 0),
            price: Math.max(1, parseFloat(String(formData.price)) || 0),
            low_stock_threshold: Math.max(0, parseInt(String(formData.low_stock_threshold), 10) || 5),
            is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true,
        };

        return await createMasterProductAction(payload);
    };

    const handleUpdate = async (id: string | number, formData: ProductFormData) => {
        const payload = {
            product_code: String(formData.product_code).trim().toUpperCase(),
            product_name: String(formData.product_name).trim(),
            price: Math.max(1, parseFloat(String(formData.price)) || 0),
            low_stock_threshold: Math.max(0, parseInt(String(formData.low_stock_threshold), 10) || 5),
            is_active: formData.is_active !== undefined ? Boolean(formData.is_active) : true,
        };
        return await updateMasterProductAction(id, payload);
    };

    const handleDelete = async (id: string | number) => {
        return await deleteMasterProductAction(id);
    };

    const getEditFormData = (item: ProductFormData) => ({
        id: item.id,
        created_at: item.created_at,
        product_code: item.product_code ?? '',
        product_name: item.product_name ?? '',
        stock: item.stock ?? 0,
        price: item.price ?? 0,
        low_stock_threshold: item.low_stock_threshold ?? 5,
        is_active: item.is_active !== undefined ? item.is_active : true,
    });

    return (
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <MasterTabShell
                config={{
                    title: 'Katalog Produk & Manajemen Stok',
                    desc: 'Kelola inventaris master produk, penetapan harga jual, ambang batas minimum, dan audit stok opname.',
                    addBtn: 'Tambah Produk',
                    icon: '📦',
                }}
                dataList={dataList}
                meta={meta}
                loading={loading}
                canCreate={isAdmin}
                canEdit={isAdmin}
                canDelete={isAdmin}
                onReload={() => loadData(pagination.page, pagination.limit, filter.search, filter.status, sort)}
                onPageChange={(page) => loadData(page, pagination.limit, filter.search, filter.status, sort)}
                onPageSizeChange={(limit) => loadData(1, limit, filter.search, filter.status, sort)}
                onSearchChange={(search) => {
                    setFilter((prev) => ({ ...prev, search }));
                    loadData(1, pagination.limit, search, filter.status, sort);
                }}
                onStatusChange={(status) => {
                    setFilter((prev) => ({ ...prev, status }));
                    loadData(1, pagination.limit, filter.search, status, sort);
                }}
                renderExtraFilters={() => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Urutan:</span>
                        <div style={{ minWidth: '175px' }}>
                            <Select2CustomDropdown
                                value={`${sort.field}:${sort.order}`}
                                onChange={(val) => handleSortChange(String(val))}
                                options={[
                                    { value: 'created_at:desc', label: 'Terbaru' },
                                    { value: 'product_name:asc', label: 'Nama (A-Z)' },
                                    { value: 'price:asc', label: 'Harga Terendah' },
                                    { value: 'price:desc', label: 'Harga Tertinggi' },
                                    { value: 'stock:asc', label: 'Stok Paling Sedikit' },
                                ]}
                                title="Pilih Urutan Produk"
                                searchable={false}
                            />
                        </div>
                    </div>
                )}
                getItemTitle={(item) => item.product_name || item.product_code}
                onCreate={handleCreate}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
                getEditFormData={getEditFormData}
                getDeleteLabel={(item) => `${item.product_code} - ${item.product_name}`}
                extraSearchFields={(item) => [item.product_code, item.product_name]}
                renderExtraActions={(item) => (
                    isAdmin && (
                        <button
                            type="button"
                            onClick={() => handleOpenOpname(item)}
                            style={{
                                background: '#0F172A',
                                color: '#FFFFFF',
                                border: 'none',
                                borderRadius: '6px',
                                padding: '5px 10px',
                                fontSize: '11.5px',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                transition: 'background 0.15s ease',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.background = '#334155')}
                            onMouseLeave={(e) => (e.currentTarget.style.background = '#0F172A')}
                            title="Buka Stock Opname & Buku Besar Mutasi (Ledger)"
                        >
                            <span>📊</span>
                            <span>Opname</span>
                        </button>
                    )
                )}
                tableColumns={[
                    {
                        header: 'KODE',
                        width: '130px',
                        render: (item) => (
                            <span style={{
                                fontFamily: 'monospace',
                                fontWeight: 700,
                                padding: '3px 8px',
                                background: '#F1F5F9',
                                borderRadius: '6px',
                                color: '#334155',
                                fontSize: '12px',
                            }}>
                                {item.product_code}
                            </span>
                        ),
                    },
                    {
                        header: 'NAMA PRODUK',
                        render: (item) => (
                            <div>
                                <span style={{ fontWeight: 700, color: '#0F172A', display: 'block' }}>
                                    {item.product_name}
                                </span>
                            </div>
                        ),
                    },
                    {
                        header: 'HARGA',
                        width: '150px',
                        render: (item) => (
                            <span style={{ fontWeight: 600, color: '#16A34A', fontSize: '13px' }}>
                                {formatIDR(item.price)}
                            </span>
                        ),
                    },
                    {
                        header: 'STOK SAAT INI',
                        width: '140px',
                        render: (item) => {
                            const isLow = isProductLowStock(item);
                            return (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: 800,
                                        padding: '3px 10px',
                                        borderRadius: '12px',
                                        background: isLow ? '#FEE2E2' : '#DCFCE7',
                                        color: isLow ? '#B91C1C' : '#15803D',
                                    }}>
                                        {item.stock} unit
                                    </span>
                                    {isLow && (
                                        <span title="Stok berada pada atau di bawah batas minimum" style={{ fontSize: '11px' }}>
                                            ⚠️
                                        </span>
                                    )}
                                </div>
                            );
                        },
                    },
                    {
                        header: 'BATAS MIN.',
                        width: '110px',
                        render: (item) => (
                            <span style={{ color: '#64748B', fontSize: '12px' }}>
                                {item.low_stock_threshold} unit
                            </span>
                        ),
                    },
                    {
                        header: 'STATUS',
                        width: '110px',
                        render: (item) => {
                            const isActive = item.is_active !== false;
                            return (
                                <span style={{
                                    fontSize: '11px',
                                    fontWeight: 700,
                                    padding: '3px 8px',
                                    borderRadius: '12px',
                                    background: isActive ? '#DCFCE7' : '#FEE2E2',
                                    color: isActive ? '#15803D' : '#B91C1C',
                                }}>
                                    {isActive ? '✓ Aktif' : '✕ Nonaktif'}
                                </span>
                            );
                        },
                    },
                ]}
                renderFormFields={(formData, setFormData) => {
                    const isEditing = Boolean(formData.id || formData.created_at);

                    return (
                        <>
                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Kode Produk <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: P0051"
                                    value={formData.product_code ?? ''}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, product_code: e.target.value.toUpperCase() }))}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Nama Produk <span style={{ color: 'red' }}>*</span>
                                </label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Contoh: Hydrococo Variant #51"
                                    value={formData.product_name ?? ''}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, product_name: e.target.value }))}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                />
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Harga Jual (Rp) <span style={{ color: 'red' }}>*</span>
                                    </label>
                                    <input
                                        type="number"
                                        required
                                        min="1"
                                        placeholder="15000"
                                        value={formData.price ?? ''}
                                        onChange={(e) => setFormData((prev: any) => ({ ...prev, price: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                    />
                                </div>

                                <div>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Batas Stok Minimum
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="5"
                                        value={formData.low_stock_threshold ?? 5}
                                        onChange={(e) => setFormData((prev: any) => ({ ...prev, low_stock_threshold: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                    />
                                </div>
                            </div>

                            <div style={{ marginBottom: '14px' }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                    Status Katalog Produk
                                </label>
                                <select
                                    value={formData.is_active !== false ? 'true' : 'false'}
                                    onChange={(e) => setFormData((prev: any) => ({ ...prev, is_active: e.target.value === 'true' }))}
                                    style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: 'white', boxSizing: 'border-box' }}
                                >
                                    <option value="true">✓ Aktif (Dapat Dipesan)</option>
                                    <option value="false">✕ Nonaktif (Arsip / Tidak Aktif)</option>
                                </select>
                            </div>

                            {!isEditing ? (
                                <div style={{ marginBottom: '14px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                                        Stok Awal
                                    </label>
                                    <input
                                        type="number"
                                        min="0"
                                        placeholder="10"
                                        value={formData.stock ?? 10}
                                        onChange={(e) => setFormData((prev: any) => ({ ...prev, stock: e.target.value }))}
                                        style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                    />
                                    <span style={{ fontSize: '11px', color: '#64748B', display: 'block', marginTop: '4px' }}>
                                        ℹ️ Stok awal otomatis mencatat mutasi ledger sistem berlabel <strong>INITIAL</strong>.
                                    </span>
                                </div>
                            ) : (
                                <div style={{ padding: '10px 12px', background: '#F8FAFC', borderRadius: '8px', border: '1px solid #E2E8F0', fontSize: '11.5px', color: '#64748B', marginBottom: '14px' }}>
                                    ℹ️ Untuk melakukan penyesuaian atau audit jumlah stok produk, gunakan tombol <strong>Opname</strong> pada baris tabel agar tercatat resmi di buku besar mutasi (Ledger).
                                </div>
                            )}
                        </>
                    );
                }}
            />

            {/* Modal Khusus Stock Opname & Ledger Mutasi */}
            {selectedProduct && (
                <ResponsiveModal
                    isOpen={Boolean(selectedProduct)}
                    onClose={() => setSelectedProduct(null)}
                    maxWidth="760px"
                    title={`Stock Opname & Ledger: ${selectedProduct.product_code}`}
                    subtitle={selectedProduct.product_name}
                    icon="📊"
                    badge={
                        <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            padding: '3px 10px',
                            borderRadius: '12px',
                            background: isProductLowStock(selectedProduct) ? '#FEE2E2' : '#DCFCE7',
                            color: isProductLowStock(selectedProduct) ? '#B91C1C' : '#15803D',
                        }}>
                            Stok Saat Ini: {selectedProduct.stock} unit (Batas Min: {selectedProduct.low_stock_threshold})
                        </span>
                    }
                    footer={
                        <div style={{ display: 'flex', justifyContent: 'flex-end', width: '100%' }}>
                            <button
                                type="button"
                                onClick={() => setSelectedProduct(null)}
                                style={{
                                    padding: '8px 18px',
                                    borderRadius: '8px',
                                    border: '1px solid #CBD5E1',
                                    background: '#F8FAFC',
                                    fontSize: '12.5px',
                                    fontWeight: 700,
                                    color: '#475569',
                                    cursor: 'pointer',
                                }}
                            >
                                Tutup
                            </button>
                        </div>
                    }
                >
                    <div style={{ padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {/* Form Penyesuaian Stok (Adjustment) */}
                        {isAdmin && (
                            <div style={{ background: '#F8FAFC', padding: '16px', borderRadius: '10px', border: '1px solid #E2E8F0' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A', marginBottom: '12px' }}>
                                    📝 Formulir Stock Opname (Penyesuaian Stok)
                                </div>
                                <form onSubmit={handleSaveAdjustment}>
                                    <div style={{ display: 'grid', gridTemplateColumns: '140px 1fr auto', gap: '12px', alignItems: 'flex-end' }}>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                                Perubahan (+ / -)
                                            </label>
                                            <input
                                                type="number"
                                                required
                                                placeholder="Contoh: 5 atau -2"
                                                value={qtyChange}
                                                onChange={(e) => setQtyChange(parseInt(e.target.value, 10) || 0)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <div>
                                            <label style={{ display: 'block', fontSize: '11.5px', fontWeight: 700, color: '#475569', marginBottom: '4px' }}>
                                                Catatan Wajib (Stock Opname) <span style={{ color: 'red' }}>*</span>
                                            </label>
                                            <input
                                                type="text"
                                                required
                                                placeholder="Misal: Penyesuaian stok opname gudang bulanan"
                                                value={adjustNote}
                                                onChange={(e) => setAdjustNote(e.target.value)}
                                                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                                            />
                                        </div>
                                        <button
                                            type="submit"
                                            disabled={adjustLoading || qtyChange === 0}
                                            style={{
                                                padding: '9px 18px',
                                                background: qtyChange === 0 ? '#94A3B8' : '#059669',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '6px',
                                                fontSize: '12.5px',
                                                fontWeight: 700,
                                                cursor: qtyChange === 0 ? 'not-allowed' : 'pointer',
                                                whiteSpace: 'nowrap',
                                                transition: 'background 0.15s ease',
                                            }}
                                        >
                                            {adjustLoading ? 'Menyimpan...' : 'Simpan Adjustment'}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        )}

                        {/* Tabel Riwayat Buku Besar Mutasi Stok (Ledger) */}
                        <div>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                                <div style={{ fontSize: '13px', fontWeight: 800, color: '#0F172A' }}>
                                    📜 Riwayat Mutasi Stok (Buku Besar / Stock Ledger)
                                </div>
                                <span style={{ fontSize: '11.5px', color: '#64748B' }}>
                                    Total: {ledgerData.length} Mutasi
                                </span>
                            </div>

                            <div style={{ maxHeight: '280px', overflowY: 'auto', border: '1px solid #E2E8F0', borderRadius: '8px' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px' }}>
                                    <thead style={{ background: '#F1F5F9', borderBottom: '1.5px solid #CBD5E1', position: 'sticky', top: 0, zIndex: 10 }}>
                                        <tr style={{ color: '#475569', fontWeight: 800 }}>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Waktu</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Tipe</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Perubahan</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>Stok Akhir</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Catatan</th>
                                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>Oleh</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {ledgerLoading ? (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                                                    ⏳ Memuat riwayat mutasi stok...
                                                </td>
                                            </tr>
                                        ) : ledgerData.length === 0 ? (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>
                                                    Belum ada riwayat mutasi stok untuk produk ini.
                                                </td>
                                            </tr>
                                        ) : (
                                            ledgerData.map((m) => (
                                                <tr key={m.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                                                    <td style={{ padding: '8px 10px', color: '#64748B', whiteSpace: 'nowrap' }}>
                                                        {new Date(m.created_at).toLocaleString('id-ID')}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', fontFamily: 'monospace', fontWeight: 700 }}>
                                                        <span style={{
                                                            padding: '2px 6px',
                                                            borderRadius: '4px',
                                                            background: m.type === 'INITIAL' ? '#EFF6FF' : m.type === 'ORDER_OUT' ? '#FEF2F2' : m.type === 'CANCEL_RESTORE' ? '#FEFCE8' : '#F0FDF4',
                                                            color: m.type === 'INITIAL' ? '#1D4ED8' : m.type === 'ORDER_OUT' ? '#B91C1C' : m.type === 'CANCEL_RESTORE' ? '#A16207' : '#15803D',
                                                        }}>
                                                            {m.type}
                                                        </span>
                                                    </td>
                                                    <td style={{
                                                        padding: '8px 10px',
                                                        textAlign: 'right',
                                                        fontWeight: 800,
                                                        color: m.quantity_change >= 0 ? '#16A34A' : '#DC2626',
                                                    }}>
                                                        {m.quantity_change > 0 ? `+${m.quantity_change}` : m.quantity_change}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                                                        {m.stock_after}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#334155' }}>
                                                        {m.note ?? '-'}
                                                    </td>
                                                    <td style={{ padding: '8px 10px', color: '#64748B', whiteSpace: 'nowrap' }}>
                                                        {m.creator?.name ?? 'Sistem'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </ResponsiveModal>
            )}
        </main>
    );
}
