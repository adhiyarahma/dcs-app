'use client';

import { useState } from 'react';
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, ExclamationTriangleIcon, FolderIcon,
  BuildingOfficeIcon, DocumentDuplicateIcon,
} from '@heroicons/react/24/outline';
import {
  createCategory, updateCategory, deleteCategory,
  createDepartment, updateDepartment, deleteDepartment,
} from '@/app/lib/actions';

type Item = { id: string; name: string; subtitle?: string; created_at?: string; };
type TableType = 'category' | 'department';

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
  item: Item; onConfirm: () => void; onCancel: () => void; loading: boolean;
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

export default function MasterTable({ type, items }: { type: TableType; items: Item[] }) {
  const [search, setSearch] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Item | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Item | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isCategory = type === 'category';
  const label = isCategory ? 'Kategori' : 'Departemen';
  const Icon = isCategory ? FolderIcon : BuildingOfficeIcon;

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.subtitle?.toLowerCase().includes(search.toLowerCase()) ?? false)
  );

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true); setError('');
    const fd = new FormData(e.currentTarget);
    const result = isCategory ? await createCategory(fd) : await createDepartment(fd);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setShowCreate(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editItem) return;
    setLoading(true); setError('');
    const fd = new FormData(e.currentTarget);
    const result = isCategory ? await updateCategory(editItem.id, fd) : await updateDepartment(editItem.id, fd);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setEditItem(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    const result = isCategory ? await deleteCategory(deleteTarget.id) : await deleteDepartment(deleteTarget.id);
    setLoading(false);
    if (result?.error) setError(result.error);
    else setDeleteTarget(null);
  }

  function FormFields({ defaultValues }: { defaultValues?: Item }) {
    if (isCategory) {
      return (
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nama Kategori</label>
          <input name="name" defaultValue={defaultValues?.name} required placeholder="contoh: Dokumen QESH"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
      );
    }
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Kode</label>
          <input name="code" defaultValue={defaultValues?.subtitle} required placeholder="contoh: IQD"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all uppercase" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nama Departemen</label>
          <input name="name" defaultValue={defaultValues?.name} required placeholder="contoh: Qualitas"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
      </div>
    );
  }

  function FormActions({ onCancel, submitLabel }: { onCancel: () => void; submitLabel: string }) {
    return (
      <div className="flex gap-2 justify-end pt-2">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
          Batal
        </button>
        <button type="submit" disabled={loading}
          className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
          {loading ? 'Menyimpan...' : submitLabel}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Stat card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
          <Icon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total {label}</p>
          <p className="text-2xl font-bold text-slate-900">{items.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder={`Cari ${label.toLowerCase()}...`}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setShowCreate(true); setEditItem(null); setError(''); }}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shrink-0">
          <PlusIcon className="w-4 h-4" />
          Tambah {label}
        </button>
      </div>

      {error && !showCreate && !editItem && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>
      )}

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                {!isCategory && <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kode</th>}
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</th>
                {isCategory && <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Jumlah Tipe</th>}
                <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={3} className="px-6 py-10 text-center text-slate-400 text-sm">Tidak ada data ditemukan.</td></tr>
              )}
              {filtered.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                  {!isCategory && (
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100 uppercase">
                        {item.subtitle}
                      </span>
                    </td>
                  )}
                  <td className="px-6 py-4 font-medium text-slate-800 text-sm">{item.name}</td>
                  {isCategory && (
                    <td className="px-6 py-4 text-sm text-slate-500">{item.subtitle}</td>
                  )}
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => { setEditItem(item); setShowCreate(false); setError(''); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button onClick={() => { setDeleteTarget(item); setError(''); }}
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
      </div>

      {/* Card list — mobile */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">Tidak ada data ditemukan.</div>
        )}
        {filtered.map((item) => (
          <div key={item.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 shadow-sm">
            <div className="min-w-0">
              {!isCategory && item.subtitle && (
                <span className="font-mono text-[10px] font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100 uppercase mr-2">
                  {item.subtitle}
                </span>
              )}
              <p className="font-medium text-slate-800 text-sm truncate mt-1">{item.name}</p>
              {isCategory && item.subtitle && (
                <p className="text-xs text-slate-400 mt-0.5">{item.subtitle} tipe dokumen</p>
              )}
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => { setEditItem(item); setShowCreate(false); setError(''); }}
                className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                <PencilIcon className="w-4 h-4" />
              </button>
              <button onClick={() => { setDeleteTarget(item); setError(''); }}
                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Tambah */}
      {showCreate && (
        <Modal title={`Tambah ${label}`} onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormFields />
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
            <FormActions onCancel={() => setShowCreate(false)} submitLabel="Simpan" />
          </form>
        </Modal>
      )}

      {/* Modal Edit */}
      {editItem && (
        <Modal title={`Edit ${label}`} onClose={() => setEditItem(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <FormFields defaultValues={editItem} />
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
            <FormActions onCancel={() => setEditItem(null)} submitLabel="Update" />
          </form>
        </Modal>
      )}

      {/* Modal Hapus */}
      {deleteTarget && (
        <DeleteModal item={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={loading} />
      )}
    </div>
  );
}
