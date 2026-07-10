// app/dashboard/document-control/distributions/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import {
  getDistributions,
  getDepartments,
  getActiveDocuments,
  getAllDocumentsForDistribution,
  getCategories,
  getDocumentTypes,
} from "@/app/lib/data";
import { fetchNextFormNumber } from "@/app/lib/actions";
import DistributionsTable from "@/app/ui/distributions-table";

export default async function DistributionsPage() {
  const session = await auth();
  if ((session?.user as any)?.role !== "admin") redirect("/dashboard");

  const [
    distributions,
    departments,
    docOptions,
    allDocOptions,
    initialFormNumber,
    categories,
    documentTypes,
  ] = await Promise.all([
    getDistributions(),
    getDepartments(),
    getActiveDocuments(),
    getAllDocumentsForDistribution(),
    fetchNextFormNumber(),
    getCategories(),
    getDocumentTypes(),
  ]);

  const currentUserId = (session?.user as any)?.id ?? "";

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-800">
          Distribusi Dokumen
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola pencatatan distribusi dokumen ke setiap departemen
        </p>
      </div>
      <DistributionsTable
        distributions={distributions}
        departments={departments}
        docOptions={docOptions}
        allDocOptions={allDocOptions}
        currentUserId={currentUserId}
        initialFormNumber={initialFormNumber}
        categories={categories}
        documentTypes={documentTypes}
      />
    </div>
  );
}
