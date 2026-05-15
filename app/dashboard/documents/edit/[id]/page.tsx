import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import { getDocumentById, getCategories, getDocumentTypes, getDepartments } from '@/app/lib/data';
import DocumentEditForm from '@/app/ui/document-edit-form';
import { Breadcrumb } from '@/app/ui/breadcrumb';

export default async function EditDocumentPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');

  const [document, categories, documentTypes, departments] = await Promise.all([
    getDocumentById(params.id),
    getCategories(),
    getDocumentTypes(),
    getDepartments(),
  ]);

  if (!document) redirect('/dashboard/documents');

  return (
    <div className="max-w-3xl mx-auto">
      <Breadcrumb items={[
        { label: 'Dokumen', href: '/dashboard/documents' },
        { label: 'Edit Dokumen' },
      ]} />
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Edit Dokumen</h1>
        <p className="text-sm text-slate-400 mt-1">
          <span className="font-mono font-bold text-slate-600">{document.doc_number as string}</span>
          {' '}— {document.title as string}
        </p>
      </div>
      <DocumentEditForm
        document={document as any}
        categories={categories as any}
        documentTypes={documentTypes as any}
        departments={departments as any}
        userId={(session?.user as any)?.id}
      />
    </div>
  );
}
