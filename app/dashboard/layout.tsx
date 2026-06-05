import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import Sidebar from "@/app/ui/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="min-h-screen bg-slate-50">
      <Suspense
        fallback={
          <div className="w-60 h-screen bg-[#0f172a] fixed left-0 top-0" />
        }
      >
        <Sidebar />
      </Suspense>
      <main className="ml-60 min-h-screen overflow-auto">
        <div className="p-8">
          <div className="max-w-7xl mx-auto">{children}</div>
        </div>
      </main>
    </div>
  );
}
