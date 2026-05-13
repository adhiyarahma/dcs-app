import { getCategories } from '@/app/lib/data';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import MasterTable from '@/app/ui/master-table';

export default async function CategoriesPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');
  const categories = await getCategories();
  
  return (
    <div className="max-w-6xl mx-auto py-4">
      <div className="flex items-end justify-between mb-8 border-b border-slate-100 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Kategori Dokumen</h1>
          </div>
          <p className="text-slate-500 font-medium">Struktur utama pengelompokan arsip digital perusahaan.</p>
        </div>
      </div>
      
      <MasterTable
        type="category"
        items={categories.map(c => ({ 
          id: c.id as string, 
          name: c.name as string, 
          subtitle: `${c.type_count} Jenis Dokumen`, 
          created_at: c.created_at as string 
        }))}
      />
    </div>
  );
}