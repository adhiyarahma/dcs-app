import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getTrashedDocuments } from '@/app/lib/data';
import { Breadcrumb } from '@/app/ui/breadcrumb';
import TrashClient from './trash-client';

export default async function TrashPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');
  const documents = await getTrashedDocuments();
  return (
    <div className="max-w-5xl mx-auto">
      <Breadcrumb items={[
        { label: 'Dokumen', href: '/dashboard/documents' },
        { label: 'Recycle Bin' },
      ]} />
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Recycle Bin</h1>
          <p className="text-sm text-slate-400 mt-1">Dokumen yang dihapus — bisa dipulihkan kapan saja</p>
        </div>
      </div>
      <TrashClient documents={documents as any} />
    </div>
  );
}
