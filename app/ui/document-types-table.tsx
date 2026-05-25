'use client';

import { useState } from 'react';
import clsx from 'clsx';
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, ExclamationTriangleIcon, DocumentDuplicateIcon, TagIcon,
  ChevronLeftIcon, ChevronRightIcon, FunnelIcon, ChevronDownIcon,
  FolderIcon // <-- Tambahan icon untuk card Kategori
} from '@heroicons/react/24/outline';
import { createDocumentType, updateDocumentType, deleteDocumentType } from '@/app/lib/actions';

type DocType = { id: string; name: string; category_id: string; category_name: string; };
type Category = { id: string; name: string; };

const PAGE_SIZE = 10;

// ─── Pagination Component ─────────────────────────────────────────────────
function Pagination({ currentPage, totalPages, onPageChange }: {
  currentPage: number; totalPages: number; onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | '...')[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push('...');
    for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) pages.push(i);
    if (currentPage < totalPages - 2) pages.push('...');
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Halaman <span className="font-semibold text-slate-600">{currentPage}</span> dari <span className="font-semibold text-slate-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === '...'
            ? <span key={`dot-${i}`} className="px-2 text-slate-300 text-xs">...</span>
            : <button
                key={p}
                onClick={() => onPageChange(p as number)}
                className={clsx(
                  'min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition-all',
                  p === currentPage
                    ? 'bg-slate-900 text-white'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                )}
              >
                {p}
              </button>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function DeleteModal({ item, onConfirm, onCancel, loading }: {
  item: DocType; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">Konfirmasi Hapus</h2>
          <p className="text-sm text-slate-500">Hapus <span className="font-semibold text-slate-700">"{item.name}"</span>?</p>
          <p className="text-xs text-red-500 mt-3 bg-red-50 px-3 py-2 rounded-lg w-full">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all">
            {loading ? 'Menghapus...' : 'Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DocumentTypesTable({ types, categories }: { types: DocType[]; categories: Category[] }) {
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState(''); // <-- State Filter Kategori
  const [currentPage, setCurrentPage] = useState(1);        // <-- State Pagination

  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<DocType | null>(null);
  const [deleteItem, setDeleteItem] = useState<DocType | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // ─── FILTER LOGIC ──────────────────────────────────────────────
  const filtered = types.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
                        t.category_name?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === '' || t.category_id === filterCategory;
    return matchSearch && matchCat;
  });

  // ─── PAGINATION LOGIC ────────────────────────────────────────────────────
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginatedTypes = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.currentTarget);
    const res = editItem ? await updateDocumentType(editItem.id, fd) : await createDocumentType(fd);
    setLoading(false);
    if (res?.error) setError(res.error);
    else { setShowModal(false); setEditItem(null); }
  }

  async function handleDelete() {
    if (!deleteItem) return;
    setLoading(true);
    const res = await deleteDocumentType(deleteItem.id);
    setLoading(false);
    if (res?.error) setError(res.error);
    else setDeleteItem(null);
  }

  return (
    <div className="space-y-5">
      {/* Stat card */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        
        {/* Card 1: Total Jenis Dokumen */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <DocumentDuplicateIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Jenis Dokumen</p>
            <p className="text-2xl font-bold text-slate-900">{types.length}</p>
          </div>
        </div>

        {/* Card 2: Total Kategori */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <FolderIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Kategori</p>
            <p className="text-2xl font-bold text-slate-900">{categories.length}</p>
          </div>
        </div>

      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari jenis dokumen..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1); // Reset page saat mencari
              }} />
          </div>
          <button onClick={() => { setShowModal(true); setEditItem(null); setError(''); }}
            className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shrink-0">
            <PlusIcon className="w-4 h-4" />
            Tambah Jenis
          </button>
        </div>

        {/* Dropdown Filter Kategori */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select
              value={filterCategory}
              onChange={e => { setFilterCategory(e.target.value); setCurrentPage(1); }}
              className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer"
            >
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {filterCategory && (
            <button
              onClick={() => { setFilterCategory(''); setCurrentPage(1); }}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all"
            >
              Reset filter
            </button>
          )}
        </div>
      </div>

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Jenis Dokumen</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kategori</th>
                <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginatedTypes.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-sm">Tidak ada data ditemukan.</td></tr>
              )}
              {paginatedTypes.map((type) => (
                <tr key={type.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-400 shrink-0">
                        <TagIcon className="w-4 h-4" />
                      </div>
                      <span className="font-medium text-slate-800 text-sm">{type.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                      {type.category_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button onClick={() => { setEditItem(type); setShowModal(true); setError(''); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setDeleteItem(type); setError(''); }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Pagination Desktop */}
        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
      </div>

      {/* Card list — mobile */}
      <div className="sm:hidden space-y-2">
        {paginatedTypes.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">Tidak ada data ditemukan.</div>
        )}
        {paginatedTypes.map((type) => (
          <div key={type.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              <p className="font-medium text-slate-800 text-sm truncate">{type.name}</p>
              <span className="mt-1 inline-block px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-100">
                {type.category_name}
              </span>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { setEditItem(type); setShowModal(true); setError(''); }}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <PencilIcon className="w-4 h-4" />
              </button>
              <button onClick={() => { setDeleteItem(type); setError(''); }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
        {/* Pagination Mobile */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-3">
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        </div>
      </div>

      {/* Modal Form */}
      {showModal && (
        <Modal title={editItem ? 'Edit Jenis Dokumen' : 'Tambah Jenis Dokumen'} onClose={() => { setShowModal(false); setEditItem(null); }}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nama Jenis</label>
              <input name="name" defaultValue={editItem?.name} required placeholder="contoh: Invoice, Surat Jalan..."
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Kategori</label>
              <select name="category_id" defaultValue={editItem?.category_id} required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white">
                <option value="">Pilih Kategori</option>
                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
              </select>
            </div>
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => { setShowModal(false); setEditItem(null); }}
                className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
              <button type="submit" disabled={loading}
                className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
                {loading ? 'Menyimpan...' : editItem ? 'Update' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal Hapus */}
      {deleteItem && (
        <DeleteModal item={deleteItem} onConfirm={handleDelete} onCancel={() => setDeleteItem(null)} loading={loading} />
      )}
    </div>
  );
}