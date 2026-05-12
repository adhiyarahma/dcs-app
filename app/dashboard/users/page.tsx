import { getUsers } from '@/app/lib/data';
import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import UsersTable from '@/app/ui/users-table';

export default async function UsersPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== 'admin') redirect('/dashboard');

  const users = await getUsers();

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">Manajemen Pengguna</h1>
      </div>
      <UsersTable users={users as any} />
    </div>
  );
}
