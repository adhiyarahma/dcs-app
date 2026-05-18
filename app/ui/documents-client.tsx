'use client';

import { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, ExclamationTriangleIcon, DocumentTextIcon,
  FunnelIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { createDocument, updateDocument, deleteDocument } from '@/app/lib/actions';

type Doc = {
  id: string; doc_number: string; title: string; revision: number;
  effective_date: string; revision_date: string | null; expiry_date: string | null;
  status: string; category_id: string; type_id: string; department_id: string | null;
  category_name: string; type_name: string; department_code: string;
  department_name: string; uploaded_by_name: string;
};
type Category = { id: string; name: string; };
type Department = { id: string; code: string; name: string; };
type DocType = { id: string; name: string; category_id: string; category_name: string; };

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 sticky top-0 bg-white z-10">
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

function DeleteModal({ doc, onConfirm, onCancel, loading }: {
  doc: Doc; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">Hapus Dokumen</h2>
          <p className="text-sm text-slate-500">Hapus <span className="font-semibold text-slate-700">"{doc.title}"</span>?</p>
          <p className="text-xs text-slate-400 mt-0.5">Dokumen akan dipindahkan ke trash.</p>
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

function DocForm({ doc, categories, departments, documentTypes, userId, onSubmit, onCancel, loading, error }: {
  doc?: Doc; categories: Category[]; departments: Department[]; documentTypes: DocType[];
  userId: string; onSubmit: (e: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void; loading: boolean; error: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState(doc?.category_id ?? '');
  const filteredTypes = documentTypes.filter(t => t.category_id === selectedCategory);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <input type="hidden" name="uploaded_by" value={userId} />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">No. Dokumen *</label>
          <input name="doc_number" defaultValue={doc?.doc_number} required placeholder="contoh: QP-001"
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Revisi *</label>
          <input name="revision" type="number" min={0} defaultValue={doc?.revision ?? 0} required
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Judul Dokumen *</label>
        <input name="title" defaultValue={doc?.title} required placeholder="Judul lengkap dokumen"
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Kategori *</label>
          <select name="category_id" required value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white">
            <option value="">Pilih Kategori</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Jenis Dokumen *</label>
          <select name="type_id" required defaultValue={doc?.type_id}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white">
            <option value="">Pilih Jenis</option>
            {filteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Departemen</label>
        <select name="department_id" defaultValue={doc?.department_id ?? ''}
          className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white">
          <option value="">Tidak ada</option>
          {departments.map(d => <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tgl Efektif *</label>
          <input name="effective_date" type="date" defaultValue={doc?.effective_date} required
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tgl Revisi</label>
          <input name="revision_date" type="date" defaultValue={doc?.revision_date ?? ''}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Tgl Kadaluarsa</label>
          <input name="expiry_date" type="date" defaultValue={doc?.expiry_date ?? ''}
            className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">{error}</div>}

      <div className="flex gap-2 justify-end pt-1">
        <button type="button" onClick={onCancel}
          className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">Batal</button>
        <button type="submit" disabled={loading}
          className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all">
          {loading ? 'Menyimpan...' : doc ? 'Update' : 'Simpan'}
        </button>
      </div>
    </form>
  );
}

export default function DocumentsClient({ documents, categories, departments, documentTypes, role, userId }: {
  documents: Doc[]; categories: Category[]; departments: Department[];
  documentTypes: DocType[]; role: string; userId: string;
}) {
  const isAdmin = role === 'admin';
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [editDoc, setEditDoc] = useState<Doc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const filtered = useMemo(() => documents.filter(d => {
    const matchSearch = !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.doc_number.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || d.category_id === filterCategory;
    const matchDept = !filterDept || d.department_id === filterDept;
    const matchStatus = !filterStatus || d.status === filterStatus;
    return matchSearch && matchCat && matchDept && matchStatus;
  }), [documents, search, filterCategory, filterDept, filterStatus]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); setLoading(true); setError('');
    const result = await createDocument(new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error); else setShowCreate(false);
  }

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault(); if (!editDoc) return;
    setLoading(true); setError('');
    const result = await updateDocument(editDoc.id, new FormData(e.currentTarget));
    setLoading(false);
    if (result?.error) setError(result.error); else setEditDoc(null);
  }

  async function handleDelete() {
    if (!deleteTarget) return; setLoading(true);
    const result = await deleteDocument(deleteTarget.id);
    setLoading(false);
    if (result?.error) setError(result.error); else setDeleteTarget(null);
  }

  return (
    <div className="space-y-5">
      {/* Stat card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
          <DocumentTextIcon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">Total Dokumen</p>
          <p className="text-2xl font-bold text-slate-900">{documents.length}</p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input type="text" placeholder="Cari nomor / judul dokumen..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
              onChange={e => setSearch(e.target.value)} />
          </div>
          {isAdmin && (
            <button onClick={() => { setShowCreate(true); setEditDoc(null); setError(''); }}
              className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shrink-0">
              <PlusIcon className="w-4 h-4" />
              Tambah Dokumen
            </button>
          )}
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-2">
          <div className="relative">
            <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
            <select value={filterCategory} onChange={e => setFilterCategory(e.target.value)}
              className="pl-8 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
              <option value="">Semua Kategori</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
              <option value="">Semua Departemen</option>
              {departments.map(d => <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>)}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="px-3 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer">
              <option value="">Semua Status</option>
              <option value="terbaru">Terbaru</option>
              <option value="kadaluarsa">Kadaluarsa</option>
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>

          {(filterCategory || filterDept || filterStatus) && (
            <button onClick={() => { setFilterCategory(''); setFilterDept(''); setFilterStatus(''); }}
              className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all">
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
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">No. Dok</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Judul</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kategori / Jenis</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Dept</th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Status</th>
                {isAdmin && <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 && (
                <tr><td colSpan={isAdmin ? 6 : 5} className="px-6 py-12 text-center text-slate-400 text-sm">Tidak ada dokumen ditemukan.</td></tr>
              )}
              {filtered.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-700">{doc.doc_number}</span>
                    <div className="text-[10px] text-slate-400 mt-0.5">Rev. {doc.revision}</div>
                  </td>
                  <td className="px-6 py-4 max-w-[240px]">
                    <p className="font-medium text-slate-800 text-sm truncate">{doc.title}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">{new Date(doc.effective_date).toLocaleDateString('id-ID')}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-xs text-slate-500">{doc.category_name}</p>
                    <p className="text-xs font-medium text-slate-700 mt-0.5">{doc.type_name}</p>
                  </td>
                  <td className="px-6 py-4">
                    {doc.department_code
                      ? <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">{doc.department_code}</span>
                      : <span className="text-slate-300 text-xs">—</span>}
                  </td>
                  <td className="px-6 py-4">
                    <span className={clsx('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase',
                      doc.status === 'terbaru' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                      {doc.status}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-1.5">
                        <button onClick={() => { setEditDoc(doc); setShowCreate(false); setError(''); }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button onClick={() => { setDeleteTarget(doc); setError(''); }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Card list — mobile */}
      <div className="sm:hidden space-y-2">
        {filtered.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">Tidak ada dokumen ditemukan.</div>
        )}
        {filtered.map(doc => (
          <div key={doc.id} className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-xs font-bold text-slate-700">{doc.doc_number}</span>
                  <span className="text-[10px] text-slate-400">Rev. {doc.revision}</span>
                  <span className={clsx('px-2 py-0.5 rounded-full text-[9px] font-bold uppercase',
                    doc.status === 'terbaru' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700')}>
                    {doc.status}
                  </span>
                </div>
                <p className="font-medium text-slate-800 text-sm mt-1 truncate">{doc.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{doc.category_name} · {doc.type_name}</p>
              </div>
              {isAdmin && (
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditDoc(doc); setShowCreate(false); setError(''); }}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button onClick={() => { setDeleteTarget(doc); setError(''); }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <Modal title="Tambah Dokumen" onClose={() => setShowCreate(false)}>
          <DocForm categories={categories} departments={departments} documentTypes={documentTypes}
            userId={userId} onSubmit={handleCreate} onCancel={() => setShowCreate(false)} loading={loading} error={error} />
        </Modal>
      )}

      {editDoc && (
        <Modal title="Edit Dokumen" onClose={() => setEditDoc(null)}>
          <DocForm doc={editDoc} categories={categories} departments={departments} documentTypes={documentTypes}
            userId={userId} onSubmit={handleUpdate} onCancel={() => setEditDoc(null)} loading={loading} error={error} />
        </Modal>
      )}

      {deleteTarget && (
        <DeleteModal doc={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={loading} />
      )}
    </div>
  );
}
