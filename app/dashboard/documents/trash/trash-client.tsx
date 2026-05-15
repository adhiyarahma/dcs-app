'use client';

import { useState } from 'react';
import { restoreDocument } from '@/app/lib/actions';
import { ArrowPathIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { Toast } from '@/app/ui/toast';

type TrashedDoc = {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
  effective_date: string;
  category_name: string;
  type_name: string;
  department_code: string | null;
  updated_at: string;
};

export default function TrashClient({ documents }: { documents: TrashedDoc[] }) {
  const [loading, setLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [docs, setDocs] = useState(documents);

  async function handleRestore(id: string) {
    setLoading(id);
    const result = await restoreDocument(id);
    setLoading(null);
    if (result?.error) {
      setToast({ message: result.error, type: 'error' });
    } else {
      setDocs(prev => prev.filter(d => d.id !== id));
      setToast({ message: 'Dokumen berhasil dipulihkan!', type: 'success' });
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      {docs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-300">
          <DocumentIcon className="w-12 h-12 mb-3" />
          <p className="text-sm font-medium">Recycle bin kosong</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">No. Dokumen</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Judul</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Rev</th>
                <th className="text-left px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Dihapus</th>
                <th className="text-right px-4 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {docs.map(doc => (
                <tr key={doc.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-slate-600">{doc.doc_number}</td>
                  <td className="px-4 py-3">
                    <p className="text-sm font-medium text-slate-700">{doc.title}</p>
                    <p className="text-xs text-slate-400">{doc.type_name}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{doc.category_name}</td>
                  <td className="px-4 py-3 text-xs font-bold text-slate-600 text-center">{String(doc.revision).padStart(2, '0')}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">
                    {new Date(doc.updated_at).toLocaleDateString('id-ID')}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleRestore(doc.id)}
                      disabled={loading === doc.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100 disabled:opacity-50 transition-all">
                      <ArrowPathIcon className={`w-3.5 h-3.5 ${loading === doc.id ? 'animate-spin' : ''}`} />
                      Pulihkan
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
