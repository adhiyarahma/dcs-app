"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDocument } from "@/app/lib/actions";
import ImportDocumentModal from "@/app/ui/ImportDocumentModal";

type Category = { id: string; name: string };
type Department = { id: string; code: string; name: string };
type DocType = { id: string; name: string; category_id: string };

interface Props {
  categories: Category[];
  departments: Department[];
  documentTypes: DocType[];
  userId: string;
}

function getFieldConfig(categoryName: string, typeName: string) {
  const isMSDS = categoryName.toLowerCase().includes("msds");
  const isMSDSKimia = isMSDS && typeName.toLowerCase().includes("kimia");
  const isMSDSBenang = isMSDS && typeName.toLowerCase().includes("benang");

  return {
    showDepartment: !isMSDS,
    showRevisionDate: isMSDSKimia,
    showExpiryDate: isMSDSKimia || isMSDSBenang,
    showProductionType: isMSDSKimia,
  };
}

const PRODUCTION_TYPE_OPTIONS = [
  { value: "production", label: "Production" },
  { value: "non-production", label: "Non-Production" },
  { value: "production bahan baku", label: "Production Bahan Baku" },
] as const;

export default function CreateDocumentClient({
  categories,
  departments,
  documentTypes,
  userId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [showImport, setShowImport] = useState(false); // ✅ dipindah ke dalam komponen

  const filteredTypes = documentTypes.filter(
    (t) => t.category_id === selectedCategoryId
  );
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId);
  const selectedType = documentTypes.find((t) => t.id === selectedTypeId);

  const fieldConfig = getFieldConfig(
    selectedCategory?.name ?? "",
    selectedType?.name ?? ""
  );

  function handleCategoryChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSelectedCategoryId(e.target.value);
    setSelectedTypeId("");
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createDocument(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push("/dashboard/documents");
    });
  }

  return (
    <>
      {/* ── Tombol Import — di atas form ── */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="px-4 py-2.5 text-sm font-medium border border-slate-300 text-slate-600 rounded-lg hover:bg-slate-50 transition-all flex items-center gap-2"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
            />
          </svg>
          Import Excel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <input type="hidden" name="uploaded_by" value={userId} />

        {/* No. Dokumen & Revisi */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              No. Dokumen <span className="text-red-500">*</span>
            </label>
            <input
              name="doc_number"
              required
              placeholder="contoh: QP-001"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Revisi
            </label>
            <input
              name="revision"
              type="number"
              min={0}
              max={8}
              defaultValue={0}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
        </div>

        {/* Judul */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Judul Dokumen <span className="text-red-500">*</span>
          </label>
          <input
            name="title"
            required
            placeholder="Judul lengkap dokumen"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>

        {/* Kategori & Jenis */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select
              name="category_id"
              required
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
            >
              <option value="">Pilih Kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Jenis Dokumen <span className="text-red-500">*</span>
            </label>
            <select
              name="type_id"
              required
              disabled={!selectedCategoryId}
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Pilih Jenis</option>
              {filteredTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Departemen — hanya untuk QESH */}
        {fieldConfig.showDepartment && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              PIC (Bagian / Departemen) <span className="text-red-500">*</span>
            </label>
            <select
              name="department_id"
              required={fieldConfig.showDepartment}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
            >
              <option value="">Pilih Departemen</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  [{d.code}] {d.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Production Type — hanya MSDS Kimia */}
        {fieldConfig.showProductionType && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Production Type <span className="text-red-500">*</span>
            </label>
            <select
              name="production_type"
              required
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
            >
              <option value="">Pilih Production Type</option>
              {PRODUCTION_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Tanggal Efektif & kondisional */}
        <div
          className={`grid grid-cols-1 gap-4 ${
            fieldConfig.showRevisionDate && fieldConfig.showExpiryDate
              ? "sm:grid-cols-3"
              : fieldConfig.showExpiryDate
              ? "sm:grid-cols-2"
              : "sm:grid-cols-1"
          }`}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tgl Efektif
            </label>
            <input
              name="effective_date"
              type="date"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>

          {fieldConfig.showRevisionDate && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Tgl Revisi <span className="text-red-500">*</span>
              </label>
              <input
                name="revision_date"
                type="date"
                required={fieldConfig.showRevisionDate}
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          )}

          {fieldConfig.showExpiryDate && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Masa Berlaku
              </label>
              <input
                name="expiry_date"
                type="date"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>
          )}
        </div>

        {/* Info field dinamis */}
        {selectedCategoryId && selectedTypeId && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs text-blue-600">
            <span className="font-semibold">
              Field aktif untuk {selectedCategory?.name} › {selectedType?.name}:
            </span>{" "}
            Tgl Efektif
            {fieldConfig.showRevisionDate && ", Tgl Revisi"}
            {fieldConfig.showExpiryDate && ", Masa Berlaku"}
            {fieldConfig.showProductionType && ", Production Type"}
            {fieldConfig.showDepartment && ", PIC Departemen"}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <a
            href="/dashboard/documents"
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Batal
          </a>
          <button
            type="submit"
            disabled={isPending}
            className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            {isPending ? "Menyimpan..." : "Simpan Dokumen"}
          </button>
        </div>
      </form>

      {/* Modal Import */}
      {showImport && (
        <ImportDocumentModal
          categories={categories}
          documentTypes={documentTypes}
          uploadedBy={userId}
          onClose={() => setShowImport(false)}
          onSuccess={() => router.push("/dashboard/documents")}
        />
      )}
    </>
  );
}
