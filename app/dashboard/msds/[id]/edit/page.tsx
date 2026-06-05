import { auth } from "@/auth";
import {
  getDepartments,
  getDocumentTypes,
  getDocumentById,
} from "@/app/lib/data";
import EditDocumentClient from "@/app/ui/edit-document-client";
import { Breadcrumb } from "@/app/ui/breadcrumb";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";

  const [document, departments, documentTypes] = await Promise.all([
    getDocumentById(params.id),
    getDepartments(),
    getDocumentTypes(),
  ]);

  if (!document) notFound();

  return (
    <div className="max-w-2xl mx-auto py-2 px-4">
      <Breadcrumb
        items={[
          { label: "Kelola Dokumen", href: "#" },
          { label: "MSDS", href: "/dashboard/msds" },
          { label: "Edit Dokumen" },
        ]}
      />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-slate-800">Edit MSDS</h1>
        <p className="text-sm text-slate-400 mt-1">
          {document.doc_number} — {document.title}
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <EditDocumentClient
          document={document as any}
          documentTypes={documentTypes}
          departments={departments}
          userId={userId}
          redirectPath="/dashboard/msds"
        />
      </div>
    </div>
  );
}
