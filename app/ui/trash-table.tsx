// app/ui/trash-table.tsx
'use client';

import { useTransition } from 'react';
import { restoreDocument } from '@/app/lib/actions';
import { ArrowUturnLeftIcon } from '@heroicons/react/24/outline';

export default function TrashTable({ documents }: { documents: any[] }) {
  const [isPending, startTransition] = useTransition();

  const handleRestore = (id: string) => {
    if (confirm('Apakah kamu yakin ingin memulihkan dokumen ini?')) {
      startTransition(async () => {
        const result = await restoreDocument(id);
        if (result?.error) {
          alert(result.error);
        }
      });
    }
  };

  if (documents.length === 0) {
    return <p className="text-slate-500 mt-4">Tidak ada dokumen di keranjang sampah.</p>;
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-x-auto">
      <table className="min-w-full text-sm text-left">
        <thead className="bg-slate-50 text-slate-600 font-medium border-b">
          <tr>
            <th className="px-4 py-3">No. Dokumen</th>
            <th className="px-4 py-3">Judul</th>
            <th className="px-4 py-3">Revisi</th>
            <th className="px-4 py-3">Dihapus Pada</th>
            <th className="px-4 py-3 text-right">Restore</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <tr key={doc.id} className="hover:bg-slate-50">
              <td className="px-4 py-3 font-medium">{doc.doc_number}</td>
              <td className="px-4 py-3">{doc.title}</td>
              <td className="px-4 py-3">{doc.revision}</td>
              <td className="px-4 py-3">
                {new Date(doc.updated_at).toLocaleDateString('id-ID')}
              </td>
              <td className="px-4 py-3 text-right">
                <button
                  onClick={() => handleRestore(doc.id)}
                  disabled={isPending}
                  className="text-blue-600 hover:text-blue-800 font-medium disabled:opacity-50"
                >
                  {isPending ? (
                    <span className="text-xs font-medium">...</span>
                  ) : (
                    <ArrowUturnLeftIcon className="w-5 h-5" />
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}