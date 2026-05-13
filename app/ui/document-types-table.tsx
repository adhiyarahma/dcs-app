'use client';

import { useState } from 'react';
import { 
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon, 
  TagIcon, Squares2X2Icon, DocumentDuplicateIcon, XMarkIcon
} from '@heroicons/react/24/outline';
import { createDocumentType, updateDocumentType, deleteDocumentType } from '@/app/lib/actions';

export default function DocumentTypesTable({ types, categories }: { types: any[], categories: any[] }) {
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = types.filter(t =>
    t.name.toLowerCase().includes(search.toLowerCase()) ||
    t.category_name?.toLowerCase().includes(search.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.currentTarget);
    const res = editItem 
      ? await updateDocumentType(editItem.id, formData)
      : await createDocumentType(formData);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setShowModal(false);
      setEditItem(null);
      setError('');
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setLoading(true);
    setError('');
    const res = await deleteDocumentType(deleteItem.id);
    setLoading(false);

    if (res?.error) {
      setError(res.error);
    } else {
      setDeleteItem(null);
      setError('');
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
              <DocumentDuplicateIcon className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-800">Total Jenis</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{types.length}</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Squares2X2Icon className="w-5 h-5" />
            </div>
            <span className="text-sm font-bold text-slate-800">Kategori Aktif</span>
          </div>
          <p className="text-2xl font-black text-slate-900">{categories.length}</p>
        </div>
      </div>

      {/* 2. Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-100/50 p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="relative w-full max-w-md">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input 
            type="text" 
            value={search}
            placeholder="Cari jenis dokumen..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none transition-all"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button 
          type="button"
          onClick={() => { setShowModal(true); setEditItem(null); setDeleteItem(null); setError(''); }}
          className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
        >
          <PlusIcon className="w-4 h-4 text-white stroke-[3px]" />
          TAMBAH JENIS
        </button>
      </div>

      {/* 3. Table */}
      <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="text-left px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Informasi Jenis Dokumen</th>
                <th className="text-left px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kategori Induk</th>
                <th className="text-right px-8 py-5 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.map((type) => (
                <tr key={type.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                        <TagIcon className="w-5 h-5" />
                      </div>
                      <span className="font-bold text-slate-700 text-[15px]">{type.name}</span>
                    </div>
                  </td>
                  <td className="px-8 py-5">
                    <span className="inline-flex items-center px-3 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">
                      {type.category_name}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        type="button"
                        onClick={() => { setEditItem(type); setShowModal(true); setDeleteItem(null); setError(''); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button 
                        type="button"
                        onClick={() => { setDeleteItem(type); setShowModal(false); setError(''); }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                      >
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

      {/* 4. MODAL FORM */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-lg overflow-hidden shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center p-6 border-b border-slate-100">
              <h3 className="font-black text-xl text-slate-900">{editItem ? 'Edit' : 'Tambah'} Jenis Dokumen</h3>
              <button type="button" onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full">
                <XMarkIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && <div className="p-3 bg-red-50 text-red-600 text-xs font-bold rounded-xl border border-red-100">{error}</div>}
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Nama Jenis Dokumen</label>
                <input 
                  name="name" 
                  defaultValue={editItem?.name}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  placeholder="Contoh: Invoice, Surat Jalan..."
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase mb-2">Kategori Induk</label>
                <select 
                  name="category_id"
                  defaultValue={editItem?.category_id}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/20 outline-none"
                  required
                >
                  <option value="">Pilih Kategori</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setShowModal(false)} className="flex-1 px-6 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold text-sm hover:bg-slate-200 transition-all">Batal</button>
                <button type="submit" disabled={loading} className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow-lg shadow-blue-200 disabled:opacity-60 transition-all">
                  {loading ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. MODAL DELETE */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl">
            <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
                <TrashIcon className="w-7 h-7 text-red-500" />
              </div>
              <h3 className="text-base font-bold text-slate-800 mb-1">Hapus Jenis Dokumen</h3>
              <p className="text-sm text-slate-500">Kamu yakin ingin menghapus jenis dokumen</p>
              <p className="text-sm font-bold text-slate-700 mt-1">"{deleteItem.name}"?</p>
              <p className="text-xs text-red-400 mt-3 bg-red-50 px-3 py-2 rounded-lg w-full">Tindakan ini tidak dapat dibatalkan.</p>
            </div>
            <div className="flex gap-2 px-6 pb-6">
              <button type="button" onClick={() => setDeleteItem(null)} className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
              <button type="button" onClick={handleDelete} disabled={loading} className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-60 transition-all">
                {loading ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}