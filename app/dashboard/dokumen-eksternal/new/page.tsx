import { auth } from "@/auth";
import { getDepartments, getDocumentTypes } from "@/app/lib/data";
import { supabaseAdmin } from "@/app/lib/supabase";
import CreateExternalDocumentClient from "@/app/ui/create-external-document-client";
import { Breadcrumb } from "@/app/ui/breadcrumb";

const CATEGORY_ID = "4f201927-3332-4123-904e-0705939f38d8";

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
          { label: "Dokumen Eksternal", href: "/dashboard/dokumen-eksternal" },
          { label: "Tambah Dokumen" },
        ]}
      />
      <div className="mb-6 mt-4">
        <h1 className="text-2xl font-bold text-slate-800">
          Tambah Dokumen Eksternal
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Tambah dokumen baru ke kategori Dokumen Eksternal
        </p>
      </div>
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <CreateExternalDocumentClient
          categories={categories}
          documentTypes={documentTypes}
          userId={userId}
          defaultCategoryId={CATEGORY_ID}
          redirectPath="/dashboard/dokumen-eksternal"
        />
      </div>
    </div>
  );
}
