import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Sidebar from "@/app/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Proteksi route
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Sidebar - sticky, tidak ikut scroll */}
      <div className="sticky top-0 h-screen flex-shrink-0">
        <Sidebar />
      </div>

      {/* Main Content Area - yang scroll */}
      <main className="flex-1 overflow-auto min-w-0">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
