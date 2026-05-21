import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCategories, getDepartments, getDocumentTypes } from '@/app/lib/data';
import CreateDocumentClient from '@/app/ui/create-document-client';

export default async function NewDocumentPage() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? 'viewer';
  const userId = (session?.user as any)?.id ?? '';

  if (role !== 'admin') redirect('/dashboard/documents');

  const [categories, departments, documentTypes] = await Promise.all([
    getCategories(),
    getDepartments(),
    getDocumentTypes(),
  ]);

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
          <a href="/dashboard/documents" className="hover:text-slate-600 transition-colors">
            Dokumen
          </a>
          <span>/</span>
          <span className="text-slate-600">Tambah</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Tambah Dokumen</h1>
        <p className="text-sm text-slate-400 mt-1">Isi form di bawah untuk menambahkan dokumen baru.</p>
      </div>

      <CreateDocumentClient
        categories={categories.map(c => ({ id: c.id as string, name: c.name as string }))}
        departments={departments}
        documentTypes={documentTypes}
        userId={userId}
      />
    </div>
  );
}