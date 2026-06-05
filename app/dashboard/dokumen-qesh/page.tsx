import { auth } from "@/auth";
import { getDepartments, getDocumentTypes } from "@/app/lib/data";
import { supabaseAdmin } from "@/app/lib/supabase";
import DocumentsClient from "@/app/ui/documents-client";
import { Breadcrumb } from "@/app/ui/breadcrumb";

const CATEGORY_ID = "ef783643-c56a-4d26-8fbc-023c1354b720";

export default async function Page() {
  const session = await auth();
  const role = (session?.user as any)?.role ?? "viewer";
  const userId = (session?.user as any)?.id ?? "";

  const [departments, documentTypes] = await Promise.all([
    getDepartments(),
    getDocumentTypes(),
  ]);

  // Filter categories hanya untuk kategori ini
  const { data: categoryData } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("id", CATEGORY_ID)
    .single();

  const categories = categoryData
    ? [{ id: categoryData.id, name: categoryData.name }]
    : [];

  const PAGE = 1000;
  let rawDocs: any[] = [];
  let from = 0;

  while (true) {
    const { data } = await supabaseAdmin
      .from("documents")
      .select(
        `id, doc_number, title, revision, effective_date, revision_date,
        expiry_date, production_type, status, created_at, updated_at,
        category_id, type_id, department_id,
        document_types!inner(name),
        categories!inner(name),
        departments(code, name),
        users(name)`
      )
      .eq("category_id", CATEGORY_ID)
      .in("status", ["terbaru", "kadaluarsa"])
      .order("doc_number")
      .range(from, from + PAGE - 1);

    if (!data || data.length === 0) break;
    rawDocs = [...rawDocs, ...data];
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const documents = (rawDocs ?? []).map((d: any) => ({
    id: d.id,
    doc_number: d.doc_number,
    title: d.title,
    revision: d.revision,
    effective_date: d.effective_date,
    revision_date: d.revision_date,
    expiry_date: d.expiry_date,
    production_type: d.production_type ?? null,
    status: d.status,
    created_at: d.created_at,
    updated_at: d.updated_at,
    category_id: d.category_id,
    type_id: d.type_id,
    department_id: d.department_id,
    category_name: d.categories?.name ?? "",
    type_name: d.document_types?.name ?? "",
    department_code: d.departments?.code ?? "",
    department_name: d.departments?.name ?? "",
    uploaded_by_name: d.users?.name ?? "",
  }));

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <Breadcrumb
        items={[
          { label: "Kelola Dokumen", href: "#" },
          { label: "Dokumen QESH" },
        ]}
      />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-slate-800">Dokumen QESH</h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola dokumen QESH perusahaan
        </p>
      </div>
      <DocumentsClient
        documents={documents}
        categories={categories}
        departments={departments}
        documentTypes={documentTypes}
        role={role}
        userId={userId}
        basePath="/dashboard/dokumen-qesh"
      />
    </div>
  );
}
