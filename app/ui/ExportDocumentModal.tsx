"use client";

import { useState } from "react";

type Category = { id: string; name: string };
type DocType = { id: string; name: string; category_id: string };
type Department = { id: string; code: string; name: string };

interface ExportDocumentModalProps {
  categories: Category[];
  documentTypes: DocType[];
  departments: Department[];
  onClose: () => void;
}

const STATUS_OPTIONS = [
  { value: "terbaru", label: "Terbaru", color: "green" },
  { value: "kadaluarsa", label: "Kadaluarsa", color: "yellow" },
  { value: "dihapus", label: "Dihapus", color: "red" },
];

// Jenis dokumen yang perlu filter departemen
const QESH_TYPES = [
  "Instruksi Kerja",
  "Formulir",
  "Spesifikasi",
  "Prosedur",
  "Panduan",
  "Job Description",
  "Job Qualification",
  "Pedoman",
];

export default function ExportDocumentModal({
  categories,
  documentTypes,
  departments,
  onClose,
}: ExportDocumentModalProps) {
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [statuses, setStatuses] = useState<string[]>([]);
  const [departmentIds, setDepartmentIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const filteredTypes = documentTypes.filter(
    (t) => t.category_id === categoryId
  );
  const selectedType = documentTypes.find((t) => t.id === typeId);
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const needsDepartment = QESH_TYPES.includes(selectedType?.name ?? "");

  // Tombol Export aktif jika: Kategori dipilih, Jenis dipilih, Minimal 1 Status dipilih,
  // dan (jika butuh departemen) minimal 1 departemen dipilih.
  const isReady =
    categoryId &&
    typeId &&
    statuses.length > 0 &&
    (!needsDepartment || departmentIds.length > 0);

  // Toggle Status
  const toggleStatus = (val: string) => {
    setStatuses((prev) =>
      prev.includes(val) ? prev.filter((s) => s !== val) : [...prev, val]
    );
  };

  // Toggle Departemen Tunggal
  const toggleDepartment = (val: string) => {
    setDepartmentIds((prev) =>
      prev.includes(val) ? prev.filter((d) => d !== val) : [...prev, val]
    );
  };

  // Toggle Semua Departemen
  const toggleAllDepartments = () => {
    if (departmentIds.length === departments.length) {
      setDepartmentIds([]); // Uncheck semua
    } else {
      setDepartmentIds(departments.map((d) => d.id)); // Check semua
    }
  };

  const handleExport = async () => {
    if (!isReady) return;
    setIsLoading(true);

    // Kirim array sebagai string yang dipisahkan koma (contoh: status=terbaru,kadaluarsa)
    const params = new URLSearchParams({
      category_id: categoryId,
      type_id: typeId,
      status: statuses.join(","),
      ...(needsDepartment && departmentIds.length > 0
        ? { department_id: departmentIds.join(",") }
        : {}),
    });

    try {
      const res = await fetch(`/api/documents/export?${params}`);
      if (!res.ok) throw new Error("Gagal export");

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="(.+)"/);
      a.href = url;
      a.download = match?.[1] ?? "export_dokumen.xlsx";
      a.click();
      URL.revokeObjectURL(url);
      onClose();
    } catch {
      alert("Gagal mengexport dokumen. Coba lagi.");
    } finally {
      setIsLoading(false);
    }
  };

  const selectClass = (disabled = false) =>
    `w-full border rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all bg-white
     ${
       disabled
         ? "border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
         : "border-slate-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
     }`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {/* 1. Tambahkan max-h-[90vh] dan flex flex-col di sini */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col">
        {/* Header (Tambahkan shrink-0 agar tidak menyusut) */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Export Dokumen
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              Pilih filter lalu download sebagai Excel
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body (Tambahkan flex-1 dan overflow-y-auto di sini agar bisa di-scroll) */}
        <div className="px-6 py-5 space-y-4 flex-1 overflow-y-auto min-h-0 custom-scrollbar">
          {/* Kategori */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Kategori Dokumen <span className="text-red-500">*</span>
            </label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setTypeId("");
                setDepartmentIds([]);
              }}
              className={selectClass()}
            >
              <option value="">-- Pilih Kategori --</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Jenis Dokumen */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Jenis Dokumen <span className="text-red-500">*</span>
            </label>
            <select
              value={typeId}
              onChange={(e) => {
                setTypeId(e.target.value);
                setDepartmentIds([]);
              }}
              disabled={!categoryId}
              className={selectClass(!categoryId)}
            >
              <option value="">-- Pilih Jenis --</option>
              {filteredTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status (Multi-select) */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Status (Bisa pilih lebih dari satu){" "}
              <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map((opt) => {
                const isSelected = statuses.includes(opt.value);
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => toggleStatus(opt.value)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all ${
                      isSelected
                        ? opt.color === "green"
                          ? "bg-green-600 border-green-600 text-white"
                          : opt.color === "yellow"
                          ? "bg-yellow-500 border-yellow-500 text-white"
                          : "bg-red-500 border-red-500 text-white"
                        : "border-slate-300 text-slate-500 hover:bg-slate-50"
                    }`}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Departemen — Multi-select dengan Checkbox */}
          {needsDepartment && (
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Departemen <span className="text-red-500">*</span>
              </label>
              <div className="border border-slate-300 rounded-lg overflow-hidden flex flex-col">
                <div className="bg-slate-50 px-3 py-2 border-b border-slate-200 shrink-0">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={
                        departmentIds.length === departments.length &&
                        departments.length > 0
                      }
                      onChange={toggleAllDepartments}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm font-semibold text-slate-700">
                      Pilih Semua Departemen
                    </span>
                  </label>
                </div>
                {/* Batasi tinggi daftar departemen juga agar tidak terlalu menjulur */}
                <div className="max-h-40 overflow-y-auto p-2 space-y-1 bg-white">
                  {departments.map((d) => (
                    <label
                      key={d.id}
                      className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={departmentIds.includes(d.id)}
                        onChange={() => toggleDepartment(d.id)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-sm text-slate-700">
                        [{d.code}] {d.name}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-1.5">
                Pilih minimal 1 departemen untuk diexport.
              </p>
            </div>
          )}

          {/* Preview filter */}
          {isReady && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-3.5 text-xs text-blue-700 space-y-1 shrink-0">
              <p className="font-semibold text-blue-800 mb-1.5">
                📋 File yang akan diexport:
              </p>
              <p>
                Kategori:{" "}
                <span className="font-medium">{selectedCategory?.name}</span>
              </p>
              <p>
                Jenis: <span className="font-medium">{selectedType?.name}</span>
              </p>
              <p>
                Status:{" "}
                <span className="font-medium capitalize">
                  {statuses.join(", ")}
                </span>
              </p>
              {needsDepartment && (
                <p>
                  Departemen:{" "}
                  <span className="font-medium">
                    {departmentIds.length === departments.length
                      ? "Semua Departemen"
                      : `${departmentIds.length} Departemen Dipilih`}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer (Tambahkan shrink-0 agar tidak menyusut) */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl shrink-0">
          <button
            onClick={onClose}
            className="text-sm text-gray-500 hover:text-gray-700 font-medium"
          >
            Batal
          </button>
          <button
            onClick={handleExport}
            disabled={!isReady || isLoading}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-lg transition-all flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <svg
                  className="w-4 h-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8v8z"
                  />
                </svg>
                Mengexport...
              </>
            ) : (
              <>
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
                    d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                  />
                </svg>
                Download Excel
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
