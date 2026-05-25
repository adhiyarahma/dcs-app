import { getDepartments } from '@/app/lib/data';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import MasterTable from '@/app/ui/master-table';

export default async function DepartmentsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');
  const departments = await getDepartments();

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Departemen</h1>
        <p className="text-sm text-slate-400 mt-1">Kelola daftar bagian / departemen</p>
      </div>
      <MasterTable
        type="department"
        items={departments.map(d => ({
          id: d.id as string,
          name: d.name as string,
          subtitle: d.code as string,
        }))}
      />
    </div>
  );
}
