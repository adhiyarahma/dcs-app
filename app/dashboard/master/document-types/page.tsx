import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDocumentTypes, getCategories } from '@/app/lib/data';
import DocumentTypesTable from '@/app/ui/document-types-table';

export default async function Page() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');

  const [types, categories] = await Promise.all([getDocumentTypes(), getCategories()]);

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Jenis Dokumen</h1>
        <p className="text-sm text-slate-400 mt-1">Kelola daftar tipe dokumen yang tersedia</p>
      </div>
      <DocumentTypesTable types={types} categories={categories} />
    </div>
  );
}
