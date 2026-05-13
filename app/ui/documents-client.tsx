'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import {
  MagnifyingGlassIcon, PlusIcon, PencilIcon, TrashIcon,
  ArrowDownTrayIcon, DocumentIcon, ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { deleteDocument } from '@/app/lib/actions';

type Document = {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
  effective_date: string;
  revision_date: string | null;
  expiry_date: string | null;
  status: 'terbaru' | 'kadaluarsa' | 'dihapus';
  type_name: string;
  department_code: string | null;
  department_name: string | null;
  uploaded_by_name: string | null;
  category_id: string;
  files?: { file_label: string; file_url: string; file_name: string; file_type: string }[];
};

type Category = { id: string; name: string; type_count: number };

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={clsx(
      'px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wide',
      status === 'terbaru' ? 'bg-green-100 text-green-700' :
      status === 'kadaluarsa' ? 'bg-amber-100 text-amber-700' :
      'bg-red-100 text-red-700'
    )}>
      {status}
    </span>
  );
}

function FileButton({ label, url, fileType }: { label: string; url: string; fileType: string }) {
  const colors: Record<string, string> = {
    pdf: 'bg-red-50 text-red-600 border-red-100 hover:bg-red-100',
    docx: 'bg-blue-50 text-blue-600 border-blue-100 hover:bg-blue-100',
    xlsx: 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100',
  };
  const color = colors[fileType] ?? 'bg-slate-50 text-slate-600 border-slate-100 hover:bg-slate-100';
  return (
    <a href={url} target="_blank" rel="noopener noreferrer"
      className={clsx('inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[10px] font-bold uppercase transition-all', color)}>
      <ArrowDownTrayIcon className="w-3 h-3" />
      {label}
    </a>
  );
}

function DeleteModal({ doc, onConfirm, onCancel, loading }: {
  doc: Document; onConfirm: () => void; onCancel: () => void; loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4">
        <div className="px-6 pt-6 pb-5 flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mb-4">
            <ExclamationTriangleIcon className="w-7 h-7 text-red-500" />
          </div>
          <h2 className="text-base font-bold text-slate-800 mb-1">Hapus Dokumen</h2>
          <p className="text-sm text-slate-500 mb-1">Kamu yakin ingin menghapus</p>
          <p className="text-sm font-bold text-slate-700">{doc.doc_number}</p>
          <p className="text-xs text-slate-500 mt-1">{doc.title}</p>
          <p className="text-xs text-red-400 mt-3 bg-red-50 px-3 py-2 rounded-lg w-full">
            Dokumen akan ditandai sebagai dihapus.
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
            Batal
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all">
            {loading ? 'Menghapus...' : 'Ya, Hapus'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Kolom per kategori
function QESHTable({ documents, role, onDelete }: { documents: Document[]; role: string; onDelete: (doc: Document) => void }) {
  const router = useRouter();
  return (
    <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-8">No</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Judul Dokumen</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">No. Dokumen</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">Rev</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">PIC / Bagian</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tgl Efektif</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">File</th>
              {role === 'admin' && <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc, i) => (
              <tr key={doc.id} className="hover:bg-blue-50/50 transition-colors group">
                <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800 text-sm">{doc.title}</div>
                  <div className="text-xs text-slate-400">{doc.type_name}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{doc.doc_number}</td>
                <td className="px-4 py-3 text-sm text-center text-slate-600 font-bold">{String(doc.revision).padStart(2, '0')}</td>
                <td className="px-4 py-3">
                  {doc.department_code ? (
                    <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-lg text-xs font-bold font-mono">
                      {doc.department_code}
                    </span>
                  ) : <span className="text-slate-300 text-xs">—</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {new Date(doc.effective_date).toLocaleDateString('id-ID')}
                </td>
                <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {doc.files?.map(f => (
                      <FileButton key={f.file_label} label={f.file_label} url={f.file_url} fileType={f.file_type} />
                    ))}
                    {(!doc.files || doc.files.length === 0) && <span className="text-slate-300 text-xs">—</span>}
                  </div>
                </td>
                {role === 'admin' && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/dashboard/documents/edit/${doc.id}`)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(doc)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm transition-all">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={role === 'admin' ? 9 : 8} className="px-4 py-10 text-center">
                  <DocumentIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Belum ada dokumen.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MSDSTable({ documents, role, onDelete, showRevisionDate }: {
  documents: Document[]; role: string; onDelete: (doc: Document) => void; showRevisionDate: boolean;
}) {
  const router = useRouter();
  return (
    <div className="bg-white border border-slate-200 rounded-[12px] overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[1000px]">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200">
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-8">No</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Judul Dokumen</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">No. Dokumen</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider w-16">Rev</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tgl Efektif</th>
              {showRevisionDate && <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tgl Revisi</th>}
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Masa Berlaku</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status</th>
              <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">File</th>
              {role === 'admin' && <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {documents.map((doc, i) => (
              <tr key={doc.id} className="hover:bg-blue-50/50 transition-colors group">
                <td className="px-4 py-3 text-sm text-slate-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="font-semibold text-slate-800 text-sm">{doc.title}</div>
                  <div className="text-xs text-slate-400">{doc.type_name}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{doc.doc_number}</td>
                <td className="px-4 py-3 text-sm text-center text-slate-600 font-bold">{String(doc.revision).padStart(2, '0')}</td>
                <td className="px-4 py-3 text-xs text-slate-600">
                  {new Date(doc.effective_date).toLocaleDateString('id-ID')}
                </td>
                {showRevisionDate && (
                  <td className="px-4 py-3 text-xs text-slate-600">
                    {doc.revision_date ? new Date(doc.revision_date).toLocaleDateString('id-ID') : <span className="text-slate-300">—</span>}
                  </td>
                )}
                <td className="px-4 py-3 text-xs text-slate-600">
                  {doc.expiry_date ? new Date(doc.expiry_date).toLocaleDateString('id-ID') : <span className="text-slate-300">—</span>}
                </td>
                <td className="px-4 py-3"><StatusBadge status={doc.status} /></td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {doc.files?.map(f => (
                      <FileButton key={f.file_label} label={f.file_label} url={f.file_url} fileType={f.file_type} />
                    ))}
                    {(!doc.files || doc.files.length === 0) && <span className="text-slate-300 text-xs">—</span>}
                  </div>
                </td>
                {role === 'admin' && (
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => router.push(`/dashboard/documents/edit/${doc.id}`)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-blue-600 hover:border-blue-200 shadow-sm transition-all">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDelete(doc)}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-red-600 hover:border-red-200 shadow-sm transition-all">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
            {documents.length === 0 && (
              <tr>
                <td colSpan={role === 'admin' ? 10 : 9} className="px-4 py-10 text-center">
                  <DocumentIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                  <p className="text-slate-400 text-sm">Belum ada dokumen.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Tentukan tabel mana yang dipakai berdasarkan nama kategori
function CategoryTable({ categoryName, documents, role, onDelete }: {
  categoryName: string; documents: Document[]; role: string; onDelete: (doc: Document) => void;
}) {
  const name = categoryName.toLowerCase();
  if (name.includes('msds')) {
    const showRevisionDate = documents.some(d => d.type_name?.toLowerCase().includes('kimia'));
    return <MSDSTable documents={documents} role={role} onDelete={onDelete} showRevisionDate={showRevisionDate} />;
  }
  return <QESHTable documents={documents} role={role} onDelete={onDelete} />;
}

export default function DocumentsClient({ documentsPerCategory, role, userId }: {
  documentsPerCategory: { category: Category; documents: Document[] }[];
  role: string;
  userId: string;
}) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('semua');
  const [deleteTarget, setDeleteTarget] = useState<Document | null>(null);
  const [loading, setLoading] = useState(false);

  const current = documentsPerCategory[activeTab];

  const filtered = current?.documents.filter(doc => {
    const matchSearch =
      doc.title.toLowerCase().includes(search.toLowerCase()) ||
      doc.doc_number.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'semua' || doc.status === statusFilter;
    return matchSearch && matchStatus;
  }) ?? [];

  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    const result = await deleteDocument(deleteTarget.id);
    setLoading(false);
    if (!result?.error) setDeleteTarget(null);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Dokumen</h1>
          <p className="text-sm text-slate-400 mt-1">Kelola seluruh dokumen perusahaan</p>
        </div>
        {role === 'admin' && (
          <button
            onClick={() => router.push('/dashboard/documents/create')}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-[10px] text-[13.5px] font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-500/20 active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            TAMBAH DOKUMEN
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
        {documentsPerCategory.map((item, i) => (
          <button
            key={item.category.id}
            onClick={() => { setActiveTab(i); setSearch(''); setStatusFilter('semua'); }}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-semibold transition-all',
              activeTab === i ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            )}
          >
            {item.category.name}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            placeholder="Cari judul atau nomor dokumen..."
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-[10px] text-sm focus:border-blue-500 outline-none transition-all shadow-sm"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-slate-200 rounded-[10px] px-3 py-2 text-sm bg-white outline-none focus:border-blue-500 shadow-sm"
        >
          <option value="semua">Semua Status</option>
          <option value="terbaru">Terbaru</option>
          <option value="kadaluarsa">Kadaluarsa</option>
        </select>
        <span className="text-xs text-slate-400 ml-auto">
          {filtered.length} dokumen ditemukan
        </span>
      </div>

      {/* Table */}
      {current && (
        <CategoryTable
          categoryName={current.category.name}
          documents={filtered}
          role={role}
          onDelete={setDeleteTarget}
        />
      )}

      {/* Modal Hapus */}
      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={loading}
        />
      )}
    </div>
  );
}
