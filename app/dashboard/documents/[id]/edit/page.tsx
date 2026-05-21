import { auth } from '@/auth';
import { redirect, notFound } from 'next/navigation';
import { getDocumentById, getDocumentTypes, getDepartments } from '@/app/lib/data';
import EditDocumentClient from '@/app/ui/edit-document-client';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditDocumentPage({ params }: Props) {
  const { id } = await params;

  const session = await auth();
  const role = (session?.user as any)?.role ?? 'viewer';
  const userId = (session?.user as any)?.id ?? '';

  // Hanya admin yang boleh edit
  if (role !== 'admin') redirect('/dashboard/documents');

  const [document, documentTypes, departments] = await Promise.all([
    getDocumentById(id),
    getDocumentTypes(),
    getDepartments(),
  ]);

  if (!document) notFound();

  // Dokumen yang sudah kadaluarsa atau dihapus tidak bisa diedit
  if (document.status === 'kadaluarsa') redirect('/dashboard/documents');
  if (document.status === 'dihapus') redirect('/dashboard/documents');

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
          <a href="/dashboard/documents" className="hover:text-slate-600 transition-colors">
            Dokumen
          </a>
          <span>/</span>
          <span className="text-slate-600">Edit</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Edit Dokumen</h1>
        <p className="text-sm text-slate-400 mt-1">
          {document.doc_number} — Rev {String(document.revision).padStart(2, '0')}
        </p>
      </div>

      <EditDocumentClient
        document={document as any}
        documentTypes={documentTypes}
        departments={departments}
        userId={userId}
      />
    </div>
  );
}
