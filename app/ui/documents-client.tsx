'use client';

import { useState, useMemo } from 'react';
import clsx from 'clsx';
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  XMarkIcon, ExclamationTriangleIcon, DocumentTextIcon,
  FunnelIcon, ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { deleteDocument } from '@/app/lib/actions';

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

export default function DocumentsClient({ documents, categories, departments, documentTypes, role, userId }: {
  documents: Doc[]; categories: Category[]; departments: Department[];
  documentTypes: DocType[]; role: string; userId: string;
}) {
  const isAdmin = role === 'admin';
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Doc | null>(null);
  const [loading, setLoading] = useState(false);

  const filtered = useMemo(() => documents.filter(d => {
    const matchSearch = !search ||
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.doc_number.toLowerCase().includes(search.toLowerCase());
    const matchCat = !filterCategory || d.category_id === filterCategory;
    const matchDept = !filterDept || d.department_id === filterDept;
    const matchStatus = !filterStatus || d.status === filterStatus;
    return matchSearch && matchCat && matchDept && matchStatus;
  }), [documents, search, filterCategory, filterDept, filterStatus]);

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    await deleteDocument(deleteTarget.id);
    setLoading(false);
    setDeleteTarget(null);
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
            <a
              href="/dashboard/documents/new"
              className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shrink-0"
            >
              <PlusIcon className="w-4 h-4" />
              Tambah Dokumen
            </a>
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
                        {doc.status === 'terbaru' && (
                          <a href={`/dashboard/documents/${doc.id}/edit`}
                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex">
                            <PencilIcon className="w-4 h-4" />
                          </a>
                        )}
                        <button onClick={() => setDeleteTarget(doc)}
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
                  {doc.status === 'terbaru' && (
                    <a href={`/dashboard/documents/${doc.id}/edit`}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors inline-flex">
                      <PencilIcon className="w-4 h-4" />
                    </a>
                  )}
                  <button onClick={() => setDeleteTarget(doc)}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {deleteTarget && (
        <DeleteModal doc={deleteTarget} onConfirm={handleDelete} onCancel={() => setDeleteTarget(null)} loading={loading} />
      )}
    </div>
  );
}
