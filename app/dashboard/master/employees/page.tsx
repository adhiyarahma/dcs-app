// app/dashboard/master/employees/page.tsx
// Server Component — fetch data di server, pass ke client

import { getEmployees } from "@/app/lib/data";
import { getDepartments } from "@/app/lib/data";
import { Breadcrumb } from "@/app/ui/breadcrumb";
import EmployeesClient from "@/app/ui/EmployeesClient";

export default async function EmployeesPage() {
  const [employees, departments] = await Promise.all([
    getEmployees(),
    getDepartments(),
  ]);

  return (
    <div className="max-w-7xl mx-auto py-2 px-4">
      <Breadcrumb
        items={[{ label: "Master Data", href: "#" }, { label: "Karyawan" }]}
      />
      <EmployeesClient
        initialEmployees={employees as any}
        departments={departments as any}
      />
    </div>
  );
}
