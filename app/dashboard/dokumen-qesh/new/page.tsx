import { auth } from "@/auth";
import { getDepartments, getDocumentTypes } from "@/app/lib/data";
import { supabaseAdmin } from "@/app/lib/supabase";
import CreateDocumentClient from "@/app/ui/create-document-client";
import { Breadcrumb } from "@/app/ui/breadcrumb";

const CATEGORY_ID = "ef783643-c56a-4d26-8fbc-023c1354b720";

export default async function Page() {
  const session = await auth();
  const userId = (session?.user as any)?.id ?? "";

  const [departments, documentTypes] = await Promise.all([
    getDepartments(),
    getDocumentTypes(),
  ]);

  const { data: categoryData } = await supabaseAdmin
    .from("categories")
    .select("id, name")
    .eq("id", CATEGORY_ID)
    .single();

  const categories = categoryData
    ? [{ id: categoryData.id, name: categoryData.name }]
    : [];

  return (
    <div className="max-w-2xl mx-auto py-2 px-4">
      <Breadcrumb
        items={[
          { label: "Kelola Dokumen", href: "#" },
          { label: "Dokumen QESH", href: "/dokumen-qesh" },
          { label: "Tambah Dokumen" },
        ]}
      />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-slate-800">
          Tambah Dokumen QESH
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Tambah dokumen baru ke kategori Dokumen QESH
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <CreateDocumentClient
          categories={categories}
          departments={departments}
          documentTypes={documentTypes}
          userId={userId}
          defaultCategoryId={CATEGORY_ID}
          redirectPath="/dashboard/dokumen-qesh"
        />
      </div>
    </div>
  );
}
