// app/dashboard/trash/page.tsx
import { fetchDeletedDocuments } from "@/app/lib/data";
import TrashTable from "@/app/ui/trash-table";

export const metadata = {
  title: "Trash - Document Control System",
};

export default async function TrashPage() {
  const deletedDocuments = await fetchDeletedDocuments();

  return (
    <div className="max-w-8xl mx-auto py-2 px-4">
      <div className="mb-6">
        <div className="flex items-center gap-2 text-sm text-slate-400 mb-3">
          <a
            href="/dashboard/documents"
            className="hover:text-slate-600 transition-colors"
          >
            Dokumen
          </a>
          <span>/</span>
          <span className="text-slate-600">Trash</span>
        </div>
        <h1 className="text-2xl font-bold text-slate-800">Dokumen Dihapus</h1>
        <p className="text-sm text-slate-400 mt-1">
          Kelola dokumen yang telah dihapus
        </p>
      </div>

      {/* Kita akan buat komponen TrashTable setelah ini */}
      <TrashTable documents={deletedDocuments || []} />
    </div>
  );
}
