import { auth } from "@/auth";
import { getDocumentTypes, getExternalDocumentById } from "@/app/lib/data";
import EditExternalDocumentClient from "@/app/ui/edit-external-document-client";
import { Breadcrumb } from "@/app/ui/breadcrumb";
import { notFound } from "next/navigation";

export default async function Page({ params }: { params: { id: string } }) {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";

  const [document, documentTypes] = await Promise.all([
    getExternalDocumentById(params.id),
    getDocumentTypes(),
  ]);

  if (!document) notFound();

  return (
    <div className="max-w-2xl mx-auto py-2 px-4">
      <Breadcrumb
        items={[
          { label: "Kelola Dokumen", href: "#" },
          { label: "Dokumen Eksternal", href: "/dashboard/dokumen-eksternal" },
          { label: "Edit Dokumen" },
        ]}
      />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-slate-800">
          Edit Dokumen Eksternal
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          {document.doc_number} — {document.title}
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <EditExternalDocumentClient
          document={document as any}
          documentTypes={documentTypes}
          redirectPath="/dashboard/dokumen-eksternal"
        />
      </div>
    </div>
  );
}
