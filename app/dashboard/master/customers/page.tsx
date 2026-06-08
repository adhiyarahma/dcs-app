// app/dashboard/master/customer/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getMasterCustomers } from "@/app/lib/data";
import MasterCustomersTable from "@/app/ui/master-customers-table";

export default async function Page() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/dashboard");

  const customers = await getMasterCustomers();

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">Master Customer</h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola daftar perusahaan customer
        </p>
      </div>
      <MasterCustomersTable customers={customers} />
    </div>
  );
}
