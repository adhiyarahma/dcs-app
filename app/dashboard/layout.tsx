import { auth } from '@/auth';
import { redirect } from 'next/navigation';
import Sidebar from '@/app/ui/sidebar';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  
  // Proteksi route
  if (!session) redirect('/login');

  return (
    <div className="flex min-h-screen bg-slate-50"> {/* Warna background lebih modern */}
      {/* Sidebar - Lebar tetap (260px sesuai desain sidebar sebelumnya) */}
      <Sidebar />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Kontainer isi agar rapi */}
        <div className="flex-1 overflow-auto p-8">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}