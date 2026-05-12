import { auth } from '@/auth';

export default async function DashboardPage() {
  const session = await auth();

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-800 mb-2">Dashboard</h1>
      <p className="text-gray-600">
        Selamat datang, <span className="font-medium">{session?.user?.name}</span>!
      </p>
      <p className="text-sm text-gray-500 mt-1">
        Role: {(session?.user as any)?.role}
      </p>
    </div>
  );
}
