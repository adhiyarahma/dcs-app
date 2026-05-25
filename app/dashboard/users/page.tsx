import { getUsers } from '@/app/lib/data';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import UsersTable from '@/app/ui/users-table';

export default async function UsersPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');
  const users = await getUsers();
  const currentUserId = (session?.user as any)?.id;

  return (
    <div className="max-w-8xl mx-auto py-2 px-2">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Pengguna</h1>
        <p className="text-sm text-slate-400 mt-1">Kelola akses pengguna aplikasi</p>
      </div>
      <UsersTable users={users as any} currentUserId={currentUserId} />
    </div>
  );
}
