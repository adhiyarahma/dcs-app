import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function WithdrawalsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/dashboard");

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Penarikan Dokumen</h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola pencatatan penarikan dokumen
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center text-slate-400 shadow-sm">
        <p className="text-sm">Halaman ini sedang dalam pengembangan.</p>
      </div>
    </div>
  );
}
