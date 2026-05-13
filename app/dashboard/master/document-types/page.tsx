import { auth } from '@/auth'; // Sesuaikan path auth Anda
import { redirect } from 'next/navigation';
import { getDocumentTypes, getCategories } from '@/app/lib/data'; // Sesuaikan path data fetcher Anda
import DocumentTypesTable from '@/app/ui/document-types-table';

export default async function Page() {
  const session = await auth();

  if ((session?.user as any)?.role !== 'admin') {
    redirect('/dashboard');
  }

  // Ambil data di sisi server
  const [types, categories] = await Promise.all([
    getDocumentTypes(),
    getCategories(),
  ]);

  return (
    <div className="max-w-7xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-slate-900">Jenis Dokumen</h1>
        <p className="text-slate-500">Kelola daftar tipe dokumen yang tersedia dalam sistem.</p>
      </div>
      
      <DocumentTypesTable types={types} categories={categories} />
    </div>
  );
}