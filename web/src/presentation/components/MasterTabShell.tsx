'use client';

import React, { useState, useEffect } from 'react';
import Select2CustomDropdown from './Select2CustomDropdown';
import ResponsiveModal from './ResponsiveModal';

// ===========================
// Tipe untuk konfigurasi tab
// ===========================
interface TabConfig {
  title: string;
  desc: string;
  addBtn: string;
  icon: string;
}

interface TableColumn {
  header: string;
  width?: string;
  render: (item: any) => React.ReactNode;
}

export interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
}

interface MasterTabShellProps {
  config: TabConfig;
  dataList: any[];
  loading: boolean;
  meta?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onSearchChange?: (query: string) => void;
  onStatusChange?: (status: 'all' | 'active' | 'inactive') => void;
  getItemTitle?: (item: any) => string;
  lookups?: any;
  showToast?: (msg: string) => void;
  onRefreshDropdowns?: () => void;
  onReload: () => Promise<void>;
  onCreate: (formData: any) => Promise<any>;
  onUpdate: (id: number | string, formData: any) => Promise<any>;
  onDelete: (id: number | string) => Promise<any>;
  getEditFormData: (item: any) => any;
  getDeleteLabel: (item: any) => string;
  tableColumns: TableColumn[];
  renderFormFields: (formData: any, setFormData: (d: any) => void) => React.ReactNode;
  /** Lebar modal, default '560px' */
  modalWidth?: string;
  /** Apakah tab ini perlu filter Active/Inactive, default true */
  showActiveFilter?: boolean;
  /** Custom filter tambahan di search bar */
  renderExtraFilters?: (dataList: any[]) => React.ReactNode;
  /** Search fields tambahan selain default key/label */
  extraSearchFields?: (item: any) => string[];
  /** Aksi tambahan di baris tabel/kartu */
  renderExtraActions?: (item: any) => React.ReactNode;
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
}

const inputStyle: React.CSSProperties = {
  padding: '9px 14px',
  paddingLeft: '36px',
  borderRadius: '8px',
  border: '1px solid #CBD5E1',
  fontSize: '12.5px',
  outline: 'none',
  background: '#F8FAFC',
  boxSizing: 'border-box',
  width: '100%',
};

const selectStyle: React.CSSProperties = {
  padding: '8px 12px',
  borderRadius: '8px',
  border: '1px solid #CBD5E1',
  fontSize: '12px',
  fontWeight: 600,
  color: '#334155',
  outline: 'none',
  cursor: 'pointer',
  background: 'white',
};

export default function MasterTabShell({
  config,
  dataList,
  loading,
  meta,
  onPageChange,
  onPageSizeChange,
  onSearchChange,
  onStatusChange,
  getItemTitle,
  showToast,
  onRefreshDropdowns,
  onReload,
  onCreate,
  onUpdate,
  onDelete,
  getEditFormData,
  getDeleteLabel,
  tableColumns,
  renderFormFields,
  modalWidth = '560px',
  showActiveFilter = true,
  renderExtraFilters,
  extraSearchFields,
  renderExtraActions,
  canCreate = true,
  canEdit = true,
  canDelete = true,
}: MasterTabShellProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterActive, setFilterActive] = useState<'all' | 'active' | 'inactive'>('all');
  const [viewMode, setViewMode] = useState<'card' | 'table'>('table');
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [formSubmitting, setFormSubmitting] = useState(false);

  // Pagination Client-Side (Fallback jika meta dari backend tidak disertakan)
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Filter Drawer Bottom Sheet (Mobile)
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Desktop otomatis pakai tabel (table view), mobile pakai kartu (card view)
  useEffect(() => {
    const handleResize = () => {
      if (typeof window !== 'undefined') {
        if (window.innerWidth < 768) {
          setViewMode('card');
        } else {
          setViewMode('table');
        }
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Filter status handler
  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive') => {
    setFilterActive(status);
    if (onStatusChange) {
      onStatusChange(status);
    } else {
      setCurrentPage(1);
    }
  };

  // Filter Client-Side (digunakan jika meta tidak disertakan atau server belum memfilter status)
  const filteredData = dataList.filter((item) => {
    if (meta && onStatusChange) return true; // Server-side sudah memfilter dari database
    const q = searchQuery.toLowerCase();
    const defaultFields = [
      item.product_name, item.product_code, item.name, item.key, item.label,
      item.station_code, item.station_name, item.unit_name, item.short_name,
      item.description, item.title, item.police_sector, item.category, item.nearest_unit,
    ];
    const extra = extraSearchFields ? extraSearchFields(item) : [];
    const matchQuery = !q || [...defaultFields, ...extra].some(
      (f) => typeof f === 'string' && f.toLowerCase().includes(q)
    );
    if (!matchQuery) return false;
    if (showActiveFilter) {
      if (filterActive === 'active' && item.is_active === false) return false;
      if (filterActive === 'inactive' && item.is_active === true) return false;
    }
    return true;
  });

  // Mode pagination: Server-Side vs Client-Side
  const isServerSide = Boolean(meta);
  const activePage = meta ? meta.page : currentPage;
  const activePageSize = meta ? meta.per_page : pageSize;
  const activeTotalPages = meta ? Math.max(1, meta.total_pages) : Math.max(1, Math.ceil(filteredData.length / pageSize));
  const activeTotalItems = (isServerSide && onStatusChange) ? meta!.total : filteredData.length;
  const activeStartIndex = meta ? (meta.page - 1) * meta.per_page : (currentPage - 1) * pageSize;
  const activeEndIndex = meta ? Math.min(activeStartIndex + dataList.length, activeTotalItems) : Math.min(activeStartIndex + pageSize, filteredData.length);
  const displayData = (isServerSide && onStatusChange) ? dataList : filteredData.slice(activeStartIndex, activeEndIndex);

  const hasActiveFilters = (showActiveFilter && filterActive !== 'all') || activePageSize !== 10;

  // Navigasi Halaman
  const handlePageClick = (page: number) => {
    if (isServerSide && onPageChange) {
      onPageChange(page);
    } else {
      setCurrentPage(page);
    }
  };

  // Ubah Jumlah Baris Per Halaman
  const handlePageSizeChange = (num: number) => {
    if (isServerSide && onPageSizeChange) {
      onPageSizeChange(num);
    } else {
      setPageSize(num);
      setCurrentPage(1);
    }
  };

  // Pencarian
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
    if (onSearchChange) {
      onSearchChange(query);
    }
  };

  // Algoritma nomor halaman pintar ala DataTables
  const getPageNumbers = () => {
    const pages = activeTotalPages;
    const current = activePage;
    if (pages <= 7) {
      return Array.from({ length: pages }, (_, i) => i + 1);
    }
    if (current <= 4) {
      return [1, 2, 3, 4, 5, '...', pages];
    }
    if (current >= pages - 3) {
      return [1, '...', pages - 4, pages - 3, pages - 2, pages - 1, pages];
    }
    return [1, '...', current - 1, current, current + 1, '...', pages];
  };

  // Komponen bar pagination ala DataTables
  const renderPaginationBar = (isCardView: boolean = false) => (
    <div className={`master-pagination-bar ${isCardView ? 'master-cards-pagination' : ''}`}>
      <div className="master-pagination-left">
        {/* Pilihan Jumlah Baris Data (Rows per page di Pagination Bar) */}
        <div className="master-pagination-pagesize">
          <span style={{ fontSize: '11.5px', color: '#64748B', fontWeight: 600 }}>Tampilkan:</span>
          <div style={{ minWidth: '95px' }}>
            <Select2CustomDropdown
              value={activePageSize}
              onChange={(val) => handlePageSizeChange(Number(val))}
              options={[
                { value: 10, label: '10 data' },
                { value: 25, label: '25 data' },
                { value: 50, label: '50 data' },
                { value: 100, label: '100 data' },
              ]}
              title="Pilih Jumlah Data Per Halaman"
              searchable={false}
            />
          </div>
        </div>

        <div className="master-pagination-divider" style={{ width: '1px', height: '18px', background: '#E2E8F0', margin: '0 2px' }} />

        <div className="master-pagination-info">
          Menampilkan <span className="highlight">{displayData.length === 0 ? 0 : activeStartIndex + 1}</span> sampai{' '}
          <span className="highlight">{activeEndIndex}</span> dari{' '}
          <span className="highlight">{activeTotalItems}</span> data
          {!isServerSide && filteredData.length !== dataList.length && (
            <span className="filtered-note"> (disaring dari total {dataList.length} data)</span>
          )}
        </div>
      </div>

      {activeTotalPages > 1 && (
        <div className="master-pagination-controls">
          {/* Tombol Pertama */}
          <button
            type="button"
            className="pagination-btn nav-btn"
            disabled={activePage === 1}
            onClick={() => handlePageClick(1)}
            title="Halaman Pertama"
          >
            «
          </button>

          {/* Tombol Sebelumnya */}
          <button
            type="button"
            className="pagination-btn nav-btn"
            disabled={activePage === 1}
            onClick={() => handlePageClick(Math.max(1, activePage - 1))}
            title="Halaman Sebelumnya"
          >
            ‹ Prev
          </button>

          {/* Nomor-nomor Halaman */}
          {getPageNumbers().map((page, idx) =>
            page === '...' ? (
              <span key={`dots-${idx}`} className="pagination-ellipsis">
                …
              </span>
            ) : (
              <button
                key={page}
                type="button"
                className={`pagination-btn ${activePage === page ? 'active' : ''}`}
                onClick={() => handlePageClick(page as number)}
              >
                {page}
              </button>
            )
          )}

          {/* Tombol Berikutnya */}
          <button
            type="button"
            className="pagination-btn nav-btn"
            disabled={activePage === activeTotalPages}
            onClick={() => handlePageClick(Math.min(activeTotalPages, activePage + 1))}
            title="Halaman Berikutnya"
          >
            Next ›
          </button>

          {/* Tombol Terakhir */}
          <button
            type="button"
            className="pagination-btn nav-btn"
            disabled={activePage === activeTotalPages}
            onClick={() => handlePageClick(activeTotalPages)}
            title="Halaman Terakhir"
          >
            »
          </button>
        </div>
      )}
    </div>
  );

  // ========================
  // Modal handlers
  // ========================
  const handleOpenAdd = () => {
    setModalMode('add');
    setEditingId(null);
    setFormData({ display_order: dataList.length + 1 });
    setShowModal(true);
  };

  const handleOpenEdit = (item: any) => {
    setModalMode('edit');
    setEditingId(item.id);
    setFormData(getEditFormData(item));
    setShowModal(true);
  };

  const handleDelete = async (item: any) => {
    const label = getDeleteLabel(item);
    if (!confirm(`Hapus data master "${label}"? Tindakan ini bersifat permanen.`)) return;
    try {
      const res = await onDelete(item.id);
      if (res?.success) {
        if (showToast) showToast(`✓ Data master "${label}" berhasil dihapus.`);
        await onReload();
        if (onRefreshDropdowns) onRefreshDropdowns();
      } else {
        alert(res?.error || 'Gagal menghapus data master.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem saat menghapus data.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormSubmitting(true);
    try {
      let res: any;
      if (modalMode === 'add') {
        res = await onCreate(formData);
      } else {
        if (!editingId) return;
        res = await onUpdate(editingId, formData);
      }

      if (res === false) return;
      if (res?.success) {
        if (showToast) {
          showToast(
            modalMode === 'add'
              ? '✓ Data master baru berhasil disimpan ke database!'
              : '✓ Data master berhasil diperbarui di database!'
          );
        }
        setShowModal(false);
        await onReload();
        if (onRefreshDropdowns) onRefreshDropdowns();
      } else {
        alert(res?.error || 'Gagal menyimpan data master.');
      }
    } catch (err: any) {
      alert(err.message || 'Terjadi kesalahan sistem.');
    } finally {
      setFormSubmitting(false);
    }
  };

  // ========================
  // Render
  // ========================
  return (
    <div style={{ padding: '0 0 40px 0' }}>
      {/* Top Banner (Responsive Card) */}
      <div className="master-banner">
        <div className="master-banner-left">
          <div className="master-banner-title-row">
            <span style={{ fontSize: '24px' }}>{config.icon}</span>
            <h2 className="master-banner-title">{config.title}</h2>
            <span className="master-banner-badge">
              Total: {activeTotalItems} Data
            </span>
          </div>
          <p className="master-banner-desc">
            {config.desc}
          </p>
        </div>
        {canCreate && (
          <button
            type="button"
            onClick={handleOpenAdd}
            className="master-banner-add-btn"
          >
            <span>➕</span>
            <span>{config.addBtn}</span>
          </button>
        )}
      </div>

      {/* Filter, Search & View Mode Bar */}
      <div className="master-toolbar">
        {/* Search row with search input and mobile action buttons */}
        <div className="master-search-row">
          <div className="master-search-box">
            <input
              type="text"
              placeholder={`Cari ${config.title.toLowerCase()}...`}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              style={inputStyle}
            />
            <span style={{ position: 'absolute', left: '12px', top: '10px', fontSize: '13px' }}>🔍</span>
          </div>

          {/* AKSI KHUSUS MOBILE: Tombol Filter Drawer + Tombol Refresh */}
          <div className="master-mobile-toolbar-actions">
            <button
              type="button"
              className={`master-filter-btn ${hasActiveFilters ? 'has-active' : ''}`}
              onClick={() => setShowFilterDrawer(true)}
              title="Buka Pengaturan Filter & Tampilan"
            >
              <span>⚙️</span>
              <span>Filter</span>
              {hasActiveFilters && <span className="filter-active-dot">●</span>}
            </button>

            <button
              type="button"
              className="master-refresh-btn-mobile"
              onClick={onReload}
              title="Muat Ulang Data"
            >
              <span>🔄</span>
            </button>
          </div>
        </div>

        {/* KONTROL LENGKAP UNTUK DESKTOP / TABLET (Otomatis disembunyikan di Mobile) */}
        <div className="master-toolbar-controls master-desktop-controls">

          {showActiveFilter && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontSize: '11.5px', fontWeight: 700, color: '#475569' }}>Status:</span>
              <div style={{ minWidth: '135px' }}>
                <Select2CustomDropdown
                  value={filterActive}
                  onChange={(val) => handleStatusFilterChange(val as any)}
                  options={[
                    { value: 'all', label: 'Semua Status' },
                    { value: 'active', label: '✓ Aktif' },
                    { value: 'inactive', label: '✕ Nonaktif' },
                  ]}
                  title="Pilih Status Data"
                  searchable={false}
                />
              </div>
            </div>
          )}

          {renderExtraFilters?.(dataList)}


          <button
            type="button"
            onClick={onReload}
            title="Muat Ulang Data"
            style={{
              background: '#F1F5F9', border: '1px solid #CBD5E1', borderRadius: '8px',
              padding: '7px 11px', fontSize: '12px', fontWeight: 700,
              color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
            }}
          >
            <span>🔄</span>
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* TAMPILAN 1: CARD VIEW (RESPONSIVE UNTUK MOBILE & TABLET) */}
      {viewMode === 'card' ? (
        <div>
          <div className="master-cards-container">
            {loading ? (
              <div style={{ background: 'white', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#64748B', border: '1px solid #E2E8F0' }}>
                <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</div>
                {' '}Memuat data {config.title.toLowerCase()}...
              </div>
            ) : displayData.length === 0 ? (
              <div style={{ background: 'white', borderRadius: '14px', padding: '40px', textAlign: 'center', color: '#64748B', border: '1px solid #E2E8F0' }}>
                Belum ada data {config.title.toLowerCase()} yang cocok dengan pencarian Anda.
              </div>
            ) : (
              displayData.map((item, idx) => {
                const itemIndex = activeStartIndex + idx + 1;
                const statusActive = item.is_active !== false;
                const mainTitle = getItemTitle
                  ? getItemTitle(item)
                  : (item.product_name
                      ? item.product_name
                      : (item.nama
                          ? (item.pangkat && !item.nama.toLowerCase().startsWith(item.pangkat.toLowerCase())
                              ? `${item.pangkat} ${item.nama}`
                              : item.nama)
                          : (item.title || item.label || item.station_name || item.unit_name || item.nama_armada || item.nama_kasus || item.product_code || item.key || `Data #${itemIndex}`)));

                return (
                  <div key={item.id ?? idx} className="master-data-card">
                    {/* Card Header */}
                    <div className="master-card-header">
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', minWidth: 0 }}>
                        <span className="master-card-num">#{itemIndex}</span>
                        <div className="master-card-main-title">{mainTitle}</div>
                      </div>
                      {showActiveFilter && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: statusActive ? '#DCFCE7' : '#F1F5F9',
                          color: statusActive ? '#15803D' : '#64748B',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}>
                          {statusActive ? '✓ Aktif' : '✕ Nonaktif'}
                        </span>
                      )}
                    </div>

                    {/* Card Fields List */}
                    <div className="master-card-fields">
                      {tableColumns.map((col, colIdx) => {
                        if (col.header.toUpperCase() === 'STATUS') return null;
                        return (
                          <div key={colIdx} className="master-card-field-row">
                            <span className="master-card-field-label">{col.header}</span>
                            <div className="master-card-field-val">{col.render(item)}</div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Card Actions Footer */}
                    <div className="master-card-actions">
                      {renderExtraActions?.(item)}
                      {canEdit && (
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          style={{
                            background: '#EFF6FF',
                            color: '#2563EB',
                            border: '1px solid #BFDBFE',
                          }}
                        >
                          <span>✏️</span>
                          <span>Edit Data</span>
                        </button>
                      )}
                      {canDelete && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          style={{
                            background: '#FEF2F2',
                            color: '#DC2626',
                            border: '1px solid #FECACA',
                          }}
                        >
                          <span>🗑️</span>
                          <span>Hapus</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {activeTotalItems > 0 && renderPaginationBar(true)}
        </div>
      ) : (
        /* TAMPILAN 2: TABLE VIEW DENGAN SCROLL HORIZONTAL SMOOTH */
        <div className="master-table-card">
          <div className="master-scroll-hint">
            <span>↔</span> Geser tabel ke samping untuk melihat kolom lengkap
          </div>
          <div className="master-table-scroll">
            <table>
              <thead>
                <tr style={{ background: '#F8FAFC', borderBottom: '1.5px solid #E2E8F0', color: '#475569', fontWeight: 800 }}>
                  <th style={{ padding: '12px 16px', width: '50px' }}>NO</th>
                  {tableColumns.map((col, i) => (
                    <th key={i} style={{ padding: '12px 16px', width: col.width }}>{col.header}</th>
                  ))}
                  <th style={{ padding: '12px 16px', width: '140px', textAlign: 'center' }}>AKSI</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={tableColumns.length + 2} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      <div style={{ display: 'inline-block', animation: 'spin 1s linear infinite' }}>⏳</div>
                      {' '}Memuat data {config.title.toLowerCase()}...
                    </td>
                  </tr>
                ) : displayData.length === 0 ? (
                  <tr>
                    <td colSpan={tableColumns.length + 2} style={{ padding: '40px', textAlign: 'center', color: '#64748B' }}>
                      Belum ada data {config.title.toLowerCase()} yang cocok dengan pencarian Anda.
                    </td>
                  </tr>
                ) : (
                  displayData.map((item, idx) => {
                    const itemIndex = activeStartIndex + idx + 1;
                    return (
                      <tr
                        key={item.id ?? idx}
                        style={{ borderBottom: '1px solid #F1F5F9', transition: 'background 0.15s' }}
                        onMouseEnter={(e) => (e.currentTarget.style.background = '#F8FAFC')}
                        onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                      >
                        <td style={{ padding: '14px 16px', fontWeight: 700, color: '#64748B' }}>
                          {itemIndex}
                        </td>
                        {tableColumns.map((col, i) => (
                          <td key={i} style={{ padding: '14px 16px' }}>{col.render(item)}</td>
                        ))}
                        <td style={{ padding: '14px 16px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                            {renderExtraActions?.(item)}
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(item)}
                                style={{
                                  background: '#EFF6FF', color: '#2563EB', border: '1px solid #BFDBFE',
                                  borderRadius: '6px', padding: '5px 10px', fontSize: '11.5px',
                                  fontWeight: 700, cursor: 'pointer',
                                }}
                              >
                                ✏️ Edit
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(item)}
                                style={{
                                  background: '#FEF2F2', color: '#DC2626', border: '1px solid #FECACA',
                                  borderRadius: '6px', padding: '5px 10px', fontSize: '11.5px',
                                  fontWeight: 700, cursor: 'pointer',
                                }}
                              >
                                🗑️
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {activeTotalItems > 0 && renderPaginationBar(false)}
        </div>
      )}

      {/* Modal Form (Responsive Reusable Dialog) */}
      <ResponsiveModal
        isOpen={showModal}
        onClose={() => !formSubmitting && setShowModal(false)}
        maxWidth={modalWidth}
        title={modalMode === 'add' ? `Tambah ${config.title}` : `Edit ${config.title}`}
        subtitle={`Formulir entri & pembaruan data master ${config.title}`}
        icon={modalMode === 'add' ? '➕' : '✏️'}
        badge={
          <span style={{
            background: modalMode === 'add' ? '#EFF6FF' : '#FEF3C7',
            color: modalMode === 'add' ? '#1D4ED8' : '#B45309',
            fontSize: '10px',
            fontWeight: 800,
            padding: '2px 8px',
            borderRadius: '6px',
            border: `1px solid ${modalMode === 'add' ? '#DBEAFE' : '#FDE68A'}`,
          }}>
            {modalMode === 'add' ? '● TAMBAH BARU' : '● EDIT DATA'}
          </span>
        }
        bodyStyle={{ padding: 0 }}
        footer={
          <div style={{ display: 'flex', gap: '10px', width: '100%', justifyContent: 'flex-end' }}>
            <button
              type="button"
              disabled={formSubmitting}
              onClick={() => setShowModal(false)}
              style={{
                flex: 1,
                maxWidth: '120px',
                padding: '10px 18px',
                borderRadius: '8px',
                border: '1px solid #CBD5E1',
                background: '#F8FAFC',
                fontSize: '13px',
                fontWeight: 700,
                color: '#64748B',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              form="master-modal-form"
              disabled={formSubmitting}
              style={{
                flex: 2,
                maxWidth: '220px',
                padding: '10px 24px',
                borderRadius: '8px',
                border: 'none',
                background: 'linear-gradient(135deg, #153E75 0%, #2563EB 100%)',
                fontSize: '13px',
                fontWeight: 800,
                color: 'white',
                cursor: 'pointer',
                boxShadow: '0 2px 6px rgba(37, 99, 235, 0.3)',
                transition: 'all 0.15s ease',
              }}
            >
              {formSubmitting ? 'Menyimpan...' : modalMode === 'add' ? 'Simpan Data' : 'Simpan Perubahan'}
            </button>
          </div>
        }
      >
        <form id="master-modal-form" onSubmit={handleSubmit} className="master-modal-form" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          <div className="master-modal-body" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
            {renderFormFields(formData, setFormData)}
          </div>
        </form>
      </ResponsiveModal>

      {/* ==================================================== */}
      {/* FILTER DRAWER BOTTOM SHEET (KHUSUS MOBILE)           */}
      {/* ==================================================== */}
      {showFilterDrawer && (
        <div
          className="master-drawer-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowFilterDrawer(false);
          }}
        >
          <div className="master-drawer-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="master-drawer-handle" />

            <div className="master-drawer-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '18px' }}>⚙️</span>
                <div>
                  <div style={{ fontWeight: 800, fontSize: '15px', color: '#0F172A' }}>
                    Filter & Tampilan
                  </div>
                  <div style={{ fontSize: '11px', color: '#64748B' }}>
                    Opsi tampilan dan filter data {config.title.toLowerCase()}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterDrawer(false)}
                className="master-drawer-close-btn"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>

            <div className="master-drawer-body">
              {/* OPSI 1: MODE TAMPILAN */}
              <div className="master-drawer-section">
                <label className="master-drawer-label">Mode Tampilan Data</label>
                <div className="master-drawer-toggle-grid">
                  <button
                    type="button"
                    className={`master-drawer-toggle-option ${viewMode === 'card' ? 'active' : ''}`}
                    onClick={() => setViewMode('card')}
                  >
                    <span style={{ fontSize: '18px' }}>📋</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px' }}>Tampilan Kartu</div>
                      <div style={{ fontSize: '10.5px', color: viewMode === 'card' ? '#DBEAFE' : '#64748B' }}>
                        Responsif untuk layar smartphone
                      </div>
                    </div>
                  </button>
                  <button
                    type="button"
                    className={`master-drawer-toggle-option ${viewMode === 'table' ? 'active' : ''}`}
                    onClick={() => setViewMode('table')}
                  >
                    <span style={{ fontSize: '18px' }}>📊</span>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '12.5px' }}>Tampilan Tabel</div>
                      <div style={{ fontSize: '10.5px', color: viewMode === 'table' ? '#DBEAFE' : '#64748B' }}>
                        Format tabel kolom lengkap
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              {/* OPSI 2: JUMLAH DATA PER HALAMAN */}
              <div className="master-drawer-section">
                <label className="master-drawer-label">Tampilkan Jumlah Data Per Halaman</label>
                <div className="master-drawer-pill-grid">
                  {[10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      type="button"
                      className={`master-drawer-pill ${pageSize === num ? 'active' : ''}`}
                      onClick={() => {
                        setPageSize(num);
                        setCurrentPage(1);
                      }}
                    >
                      {num} Data
                    </button>
                  ))}
                </div>
              </div>

              {/* OPSI 3: FILTER STATUS */}
              {showActiveFilter && (
                <div className="master-drawer-section">
                  <label className="master-drawer-label">Status Data</label>
                  <div className="master-drawer-pill-grid">
                    {[
                      { val: 'all', label: 'Semua Status' },
                      { val: 'active', label: '✓ Aktif' },
                      { val: 'inactive', label: '✕ Nonaktif' },
                    ].map((opt) => (
                      <button
                        key={opt.val}
                        type="button"
                        className={`master-drawer-pill ${filterActive === opt.val ? 'active' : ''}`}
                        onClick={() => handleStatusFilterChange(opt.val as any)}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* OPSI 4: FILTER TAMBAHAN (JIKA ADA) */}
              {renderExtraFilters && (
                <div className="master-drawer-section">
                  <label className="master-drawer-label">Filter Kategori Tambahan</label>
                  <div style={{ marginTop: '4px' }}>
                    {renderExtraFilters(dataList)}
                  </div>
                </div>
              )}
            </div>

            <div className="master-drawer-footer">
              {hasActiveFilters && (
                <button
                  type="button"
                  className="master-drawer-reset-btn"
                  onClick={() => {
                    handleStatusFilterChange('all');
                    setPageSize(10);
                    setCurrentPage(1);
                  }}
                >
                  Reset Filter
                </button>
              )}
              <button
                type="button"
                className="master-drawer-submit-btn"
                onClick={() => setShowFilterDrawer(false)}
              >
                ✓ Terapkan & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
