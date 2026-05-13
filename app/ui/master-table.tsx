'use client';

import { useState } from 'react';

// 1. IMPORT DARI HEROICONS (Ikon)
import { 
  MagnifyingGlassIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  XMarkIcon, 
  ExclamationTriangleIcon,
  FolderIcon, 
  BuildingOfficeIcon, 
  DocumentIcon 
} from '@heroicons/react/24/outline';

// 2. IMPORT DARI ACTIONS (Logika Database)
// Pastikan tidak ada FolderIcon dkk di dalam kurung kurawal ini
import { 
  createCategory, 
  updateCategory, 
  deleteCategory, 
  createDepartment, 
  updateDepartment, 
  deleteDepartment 
} from '@/app/lib/actions';

type Item = { id: string; name: string; subtitle?: string; created_at?: string; };
type TableType = 'category' | 'department';

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="text-base font-bold text-slate-800">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function DeleteModal({ item, onConfirm, onCancel, loading }: { item: Item; onConfirm: () => void; onCancel: () => void; loading: boolean; }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">Konfirmasi Hapus</h2>
          <p className="text-sm text-slate-500">Kamu yakin ingin menghapus</p>
          <p className="text-sm font-bold text-slate-700 mt-1">"{item.name}"?</p>
          <p className="text-xs text-red-400 mt-3 bg-red-50 px-3 py-2 rounded-lg w-full">Tindakan ini tidak dapat dibatalkan.</p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onCancel} className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
          <button onClick={onConfirm} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all active:scale-95">
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
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

  const filtered = items.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    i.subtitle?.toLowerCase().includes(search.toLowerCase())
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
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all uppercase"
            style={{ textTransform: 'uppercase' }} />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Nama Departemen</label>
          <input name="name" defaultValue={defaultValues?.name} required placeholder="contoh: Qualitas"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* STATS SECTION - Membuat halaman tidak kosong */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
            {isCategory ? <FolderIcon className="w-6 h-6" /> : <BuildingOfficeIcon className="w-6 h-6" />}
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total {label}</p>
            <p className="text-2xl font-bold text-slate-900">{items.length}</p>
          </div>
        </div>
        
        {/* Placeholder Stat tambahan agar ramai */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <DocumentIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Terakhir Diperbarui</p>
            <p className="text-sm font-bold text-slate-900 leading-7">Hari Ini</p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-5 rounded-2xl shadow-lg shadow-blue-200 flex items-center justify-between">
          <div className="text-white">
            <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Butuh Bantuan?</p>
            <p className="text-sm font-semibold">Panduan Input Data</p>
          </div>
          <button className="bg-white/20 hover:bg-white/30 text-white p-2 rounded-lg transition-all">
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* TOOLBAR */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-slate-100/50 p-4 rounded-2xl border border-slate-200">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder={`Cari ${label.toLowerCase()}...`}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            onChange={(e) => setSearch(e.target.value)} />
        </div>
        <button onClick={() => { setShowCreate(true); setEditItem(null); setError(''); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shadow-sm">
          <PlusIcon className="w-4 h-4" />
          TAMBAH {label.toUpperCase()}
        </button>
      </div>

      {/* TABLE SECTION */}
      <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              {!isCategory && <th className="text-left px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kode Dept</th>}
              <th className="text-left px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Informasi {label}</th>
              {isCategory && <th className="text-left px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Jumlah Tipe</th>}
              <th className="text-right px-8 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Manajemen</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {filtered.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/80 transition-colors group">
                {!isCategory && (
                  <td className="px-8 py-5">
                    <span className="font-mono text-[11px] font-black bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-100 uppercase">
                      {item.subtitle}
                    </span>
                  </td>
                )}
                <td className="px-8 py-5">
                   <div className="font-bold text-slate-800 text-sm">{item.name}</div>
                   {isCategory && <div className="text-[11px] text-slate-400 mt-0.5">Sistem Dokumen DCS</div>}
                </td>
                {isCategory && (
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                      <span className="text-sm text-slate-600 font-medium">{item.subtitle}</span>
                    </div>
                  </td>
                )}
                <td className="px-8 py-5">
                  <div className="flex justify-end gap-3 transition-all">
                    <button onClick={() => { setEditItem(item); setShowCreate(false); setError(''); }}
                      className="text-slate-400 hover:text-blue-600 p-1 hover:bg-blue-50 rounded-md transition-colors">
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button onClick={() => { setDeleteTarget(item); setError(''); }}
                      className="text-slate-400 hover:text-red-600 p-1 hover:bg-red-50 rounded-md transition-colors">
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showCreate && (
        <Modal title={`Tambah ${label}`} onClose={() => setShowCreate(false)}>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormFields />
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setShowCreate(false)} className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">
                {loading ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {editItem && (
        <Modal title={`Edit ${label}`} onClose={() => setEditItem(null)}>
          <form onSubmit={handleUpdate} className="space-y-4">
            <FormFields defaultValues={editItem} />
            {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}
            <div className="flex gap-2 justify-end pt-1">
              <button type="button" onClick={() => setEditItem(null)} className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
              <button type="submit" disabled={loading} className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">
                {loading ? 'Menyimpan...' : 'Update'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {deleteTarget && (
        <DeleteModal item={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={loading} />
      )}
    </div>
  );
}
