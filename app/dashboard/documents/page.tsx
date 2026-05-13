import { auth } from '@/auth';
import { getCategories, getDocumentsByCategory } from '@/app/lib/data';
import DocumentsClient from '@/app/ui/documents-client';

export default async function DocumentsPage() {
  const session = await auth();
  const role = (session?.user as any)?.role;
  const userId = (session?.user as any)?.id;

  const categories = await getCategories();

  // Ambil dokumen untuk semua kategori
  const documentsPerCategory = await Promise.all(
    categories.map(async (cat) => ({
      category: cat,
      documents: await getDocumentsByCategory(cat.id as string),
    }))
  );

  return (
    <DocumentsClient
      documentsPerCategory={documentsPerCategory as any}
      role={role}
      userId={userId}
    />
  );
}
