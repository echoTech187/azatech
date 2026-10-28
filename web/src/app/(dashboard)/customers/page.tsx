'use client';

import React, { useState, useEffect } from 'react';
import MasterTabShell from '@/src/presentation/components/MasterTabShell';
import Select2CustomDropdown from '@/src/presentation/components/Select2CustomDropdown';
import {
  getMasterCustomersAction,
  createMasterCustomerAction,
  updateMasterCustomerAction,
  deleteMasterCustomerAction,
} from '@/src/actions/customer.actions';
import { Customer, PaginationMeta } from '@/src/domain/entities/models';
import { useAuth } from '@/src/application/hooks/use-auth';

export interface CustomerFormData {
  id?: string;
  customer_name?: string;
  customer_address?: string;
  gender?: 'Pria' | 'Wanita';
  birth_date?: string;
  phone?: string;
  email?: string;
  [key: string]: any;
}

export default function CustomersPage() {
  const { isAdmin } = useAuth();

  const [dataList, setDataList] = useState<Customer[]>([]);
  const [meta, setMeta] = useState<PaginationMeta | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, limit: 10 });
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<{ field: string; order: string }>({
    field: 'created_at',
    order: 'desc',
  });

  const loadData = async (
    targetPage?: number,
    targetLimit?: number,
    targetSearch?: string,
    targetSort?: { field: string; order: string }
  ) => {
    setLoading(true);
    try {
      const pageParam = targetPage ?? pagination.page;
      const limitParam = targetLimit ?? pagination.limit;
      const searchParam = targetSearch !== undefined ? targetSearch : search;
      const sortParam = targetSort ?? sort;

      const res = await getMasterCustomersAction({
        page: pageParam,
        per_page: limitParam,
        search: searchParam,
        sort_by: sortParam.field,
        sort_dir: sortParam.order,
      });

      if (res?.data) {
        setDataList(res.data);
      }
      if (res?.meta) {
        setMeta(res.meta);
        setPagination({ page: res.meta.page, limit: res.meta.per_page });
      }
    } catch (err) {
      console.warn('Gagal memuat data pelanggan:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSortChange = (combinedValue: string) => {
    const [field, order] = combinedValue.split(':');
    const newSort = { field, order };
    setSort(newSort);
    loadData(1, pagination.limit, search, newSort);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = async (formData: CustomerFormData) => {
    if (!formData.customer_name?.trim()) {
      alert('Nama pelanggan wajib diisi!');
      return false;
    }
    if (!formData.customer_address?.trim()) {
      alert('Alamat pelanggan wajib diisi!');
      return false;
    }
    if (!formData.birth_date) {
      alert('Tanggal lahir pelanggan wajib diisi!');
      return false;
    }

    try {
      await createMasterCustomerAction({
        customer_name: formData.customer_name.trim(),
        customer_address: formData.customer_address.trim(),
        gender: formData.gender === 'Wanita' ? 'Wanita' : 'Pria',
        birth_date: formData.birth_date,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
      });
      return true;
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Gagal menambahkan pelanggan';
      alert(errMsg);
      return false;
    }
  };

  const handleUpdate = async (id: string | number, formData: CustomerFormData) => {
    try {
      await updateMasterCustomerAction(String(id), {
        customer_name: formData.customer_name?.trim(),
        customer_address: formData.customer_address?.trim(),
        gender: formData.gender === 'Wanita' ? 'Wanita' : 'Pria',
        birth_date: formData.birth_date,
        phone: formData.phone?.trim() || null,
        email: formData.email?.trim() || null,
      });
      return true;
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Gagal memperbarui data pelanggan';
      alert(errMsg);
      return false;
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await deleteMasterCustomerAction(String(id));
      return true;
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || err?.message || 'Gagal menghapus data pelanggan';
      alert(errMsg);
      return false;
    }
  };

  const formatDateDisplay = (dateStr: string) => {
    if (!dateStr) return '-';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const getEditFormData = (item: Customer) => ({
    id: item.id,
    customer_name: item.customer_name,
    customer_address: item.customer_address,
    gender: item.gender,
    birth_date: item.birth_date ? item.birth_date.substring(0, 10) : '',
    phone: item.phone ?? '',
    email: item.email ?? '',
  });

  return (
    <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
      <MasterTabShell
        config={{
          title: 'Master Data Pelanggan',
          desc: 'Kelola direktori kontak pelanggan toko online, alamat domisili, dan profil identitas pembeli.',
          addBtn: 'Tambah Pelanggan',
          icon: '👥',
        }}
        dataList={dataList}
        meta={meta}
        loading={loading}
        showActiveFilter={false}
        canCreate={true} // Admin & Kasir dapat menambah pelanggan
        canEdit={true}   // Admin & Kasir dapat mengedit pelanggan
        canDelete={isAdmin} // HANYA Admin yang boleh menghapus pelanggan (RBAC Rule)
        onReload={() => loadData(pagination.page, pagination.limit, search, sort)}
        onPageChange={(page) => loadData(page, pagination.limit, search, sort)}
        onPageSizeChange={(limit) => loadData(1, limit, search, sort)}
        onSearchChange={(query) => {
          setSearch(query);
          loadData(1, pagination.limit, query, sort);
        }}
        renderExtraFilters={() => (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Urutan:</span>
            <div style={{ minWidth: '160px' }}>
              <Select2CustomDropdown
                value={`${sort.field}:${sort.order}`}
                onChange={(val) => handleSortChange(String(val))}
                options={[
                  { value: 'created_at:desc', label: 'Terbaru' },
                  { value: 'customer_name:asc', label: 'Nama (A-Z)' },
                  { value: 'customer_name:desc', label: 'Nama (Z-A)' },
                  { value: 'birth_date:desc', label: 'Usia Termuda' },
                  { value: 'birth_date:asc', label: 'Usia Tertua' },
                ]}
                title="Pilih Urutan Pelanggan"
                searchable={false}
              />
            </div>
          </div>
        )}
        getItemTitle={(item) => item.customer_name}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        getEditFormData={getEditFormData}
        getDeleteLabel={(item) => item.customer_name}
        extraSearchFields={(item) => [
          item.customer_name,
          item.customer_address,
          item.email ?? '',
          item.phone ?? '',
        ]}
        tableColumns={[
          {
            header: 'NAMA PELANGGAN',
            width: '220px',
            render: (item) => (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    background: item.gender === 'Wanita' ? '#FCE7F3' : '#EFF6FF',
                    color: item.gender === 'Wanita' ? '#DB2777' : '#2563EB',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 800,
                    fontSize: '12px',
                    flexShrink: 0,
                  }}
                >
                  {item.customer_name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span style={{ fontWeight: 700, color: '#0F172A', display: 'block' }}>
                    {item.customer_name}
                  </span>
                  <span style={{ fontSize: '11px', color: '#64748B' }}>
                    ID: {item.id.substring(0, 8)}...
                  </span>
                </div>
              </div>
            ),
          },
          {
            header: 'GENDER',
            width: '110px',
            render: (item) => (
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 700,
                  padding: '3px 10px',
                  borderRadius: '12px',
                  background: item.gender === 'Wanita' ? '#FDF2F8' : '#EFF6FF',
                  color: item.gender === 'Wanita' ? '#9D174D' : '#1E40AF',
                  border: item.gender === 'Wanita' ? '1px solid #FBCFE8' : '1px solid #BFDBFE',
                }}
              >
                {item.gender === 'Wanita' ? '👩 Wanita' : '👨 Pria'}
              </span>
            ),
          },
          {
            header: 'TGL LAHIR',
            width: '120px',
            render: (item) => (
              <span style={{ color: '#475569', fontSize: '12px', fontWeight: 500 }}>
                {formatDateDisplay(item.birth_date)}
              </span>
            ),
          },
          {
            header: 'KONTAK',
            width: '210px',
            render: (item) => (
              <div style={{ fontSize: '12px' }}>
                {item.phone && (
                  <div style={{ color: '#0F172A', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <span>📞</span>
                    <span>{item.phone}</span>
                  </div>
                )}
                {item.email && (
                  <div style={{ color: '#64748B', display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                    <span>✉️</span>
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '170px' }}>
                      {item.email}
                    </span>
                  </div>
                )}
                {!item.phone && !item.email && (
                  <span style={{ color: '#94A3B8', fontStyle: 'italic' }}>Tanpa kontak</span>
                )}
              </div>
            ),
          },
          {
            header: 'ALAMAT',
            render: (item) => (
              <span style={{ color: '#334155', fontSize: '12px', lineHeight: '1.4', display: 'block' }}>
                {item.customer_address}
              </span>
            ),
          },
        ]}
        renderFormFields={(formData, setFormData) => (
          <>
            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Nama Lengkap Pelanggan <span style={{ color: 'red' }}>*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: Budi Santoso"
                value={formData.customer_name ?? ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, customer_name: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Jenis Kelamin <span style={{ color: 'red' }}>*</span>
                </label>
                <select
                  value={formData.gender ?? 'Pria'}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, gender: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', background: 'white', boxSizing: 'border-box' }}
                >
                  <option value="Pria">Pria</option>
                  <option value="Wanita">Wanita</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Tanggal Lahir <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="date"
                  required
                  value={formData.birth_date ?? ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, birth_date: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Nomor Telepon (WhatsApp)
                </label>
                <input
                  type="tel"
                  placeholder="081234567890"
                  value={formData.phone ?? ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, phone: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                  Alamat Email
                </label>
                <input
                  type="email"
                  placeholder="budi@example.com"
                  value={formData.email ?? ''}
                  onChange={(e) => setFormData((prev: any) => ({ ...prev, email: e.target.value }))}
                  style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 700, color: '#334155', marginBottom: '6px' }}>
                Alamat Domisili <span style={{ color: 'red' }}>*</span>
              </label>
              <textarea
                required
                rows={3}
                placeholder="Alamat lengkap jalan, nomor rumah, RT/RW, kelurahan, kecamatan, kota..."
                value={formData.customer_address ?? ''}
                onChange={(e) => setFormData((prev: any) => ({ ...prev, customer_address: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: '8px', border: '1px solid #CBD5E1', fontSize: '12.5px', boxSizing: 'border-box' }}
              />
            </div>
          </>
        )}
      />
    </main>
  );
}
