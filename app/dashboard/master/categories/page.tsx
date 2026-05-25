import { getCategories } from '@/app/lib/data';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import MasterTable from '@/app/ui/master-table';

export default async function CategoriesPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');
  const categories = await getCategories();

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Kategori</h1>
        <p className="text-sm text-slate-400 mt-1">Kelola daftar kategori dokumen</p>
      </div>
      <MasterTable
        type="category"
        items={categories.map(c => ({
          id: c.id as string,
          name: c.name as string,
          subtitle: `${c.type_count} Jenis`,
          created_at: c.created_at as string,
        }))}
      />
    </div>
  );
}
