import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getCategories, getDocumentTypes, getDepartments } from '@/app/lib/data';
import DocumentForm from '@/app/ui/document-form';

export default async function CreateDocumentPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');

  const [categories, documentTypes, departments] = await Promise.all([
    getCategories(),
    getDocumentTypes(),
    getDepartments(),
  ]);

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Tambah Dokumen</h1>
        <p className="text-sm text-slate-400 mt-1">Isi form berikut untuk menambahkan dokumen baru</p>
      </div>
      <DocumentForm
        categories={categories as any}
        documentTypes={documentTypes as any}
        departments={departments as any}
        userId={(session?.user as any)?.id}
      />
    </div>
  );
}
