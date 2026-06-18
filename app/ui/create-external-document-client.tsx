"use client";

import { useState, useTransition } from "react";
import { createExternalDocument } from "@/app/lib/actions";
import { ArrowUpTrayIcon } from "@heroicons/react/24/outline";
import ImportExternalDocumentModal from "@/app/ui/ImportExternalDocumentModal";

type Category = { id: string; name: string };
type DocType = { id: string; name: string; category_id: string };

interface Props {
  categories: Category[];
  documentTypes: DocType[];
  userId: string;
  defaultCategoryId?: string;
  categoryId?: string;
  redirectPath?: string;
}

// Konfigurasi field per jenis dokumen eksternal
function getFieldConfig(typeName: string) {
  const t = typeName.toLowerCase();
  return {
    // Visibilitas field
    showSource: ["coa", "diu", "itp", "pip", "spk", "tes"].includes(t),
    showTanggal: ["coa", "diu", "tes"].includes(t), // → effective_date
    showRevision: t === "itp",
    showTglEfektif: t === "itp", // → effective_date
    showStatus: ["itp", "kal", "tes"].includes(t),
    showTestReportNo: t === "tes",
    showNoOrder: t === "kal",
    isKal: t === "kal",

    // Required per field per jenis:
    // COA: sumber✅, tanggal✅
    // DIU: sumber⬜, tanggal✅
    // ITP: sumber✅, tgl efektif⬜, revisi⬜, status⬜
    // KAL: expiry_date✅, sisanya⬜
    // PIP: hanya judul & no dokumen (tidak ada field tambahan yg required)
    // SPK: hanya judul & no dokumen (tidak ada field tambahan yg required)
    // TES: sumber✅, tanggal✅, test_report_no⬜
    sourceRequired: ["coa", "itp", "tes"].includes(t),
    tanggalRequired: ["coa", "diu", "tes"].includes(t),
    tglEfektifRequired: false, // ITP: optional
    expiryDateRequired: t === "kal",
    noOrderRequired: false, // KAL: optional
    testReportNoRequired: false, // TES: optional
  };
}

const STATUS_OPTIONS = [
  { value: "terbaru", label: "Terbaru" },
  { value: "kadaluarsa", label: "Kadaluarsa" },
];

export default function CreateExternalDocumentClient({
  categories,
  documentTypes,
  userId,
  defaultCategoryId = "",
  categoryId = "",
  redirectPath = "/dashboard/dokumen-eksternal",
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedCategoryId] = useState(defaultCategoryId);
  const [selectedTypeId, setSelectedTypeId] = useState("");
  const [showImport, setShowImport] = useState(false);

  const selectedType = documentTypes.find((t) => t.id === selectedTypeId);
  const cfg = getFieldConfig(selectedType?.name ?? "");

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    // Inject type_name supaya action bisa deteksi KAL
    formData.set("type_name", selectedType?.name ?? "");
    startTransition(async () => {
      const result = await createExternalDocument(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      window.location.href = redirectPath;
    });
  }

  const filteredTypes = documentTypes.filter(
    (t) => t.category_id === (categoryId || selectedCategoryId)
  );

  return (
    <>
      {/* Tombol Import pojok kanan atas */}
      <div className="flex justify-end mb-4">
        <button
          type="button"
          onClick={() => setShowImport(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-bold border border-slate-200 text-slate-600 bg-white hover:bg-slate-50 rounded-xl transition-all"
        >
          <ArrowUpTrayIcon className="w-4 h-4" />
          Import dari Excel
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <input type="hidden" name="uploaded_by" value={userId} />
        <input type="hidden" name="category_id" value={selectedCategoryId} />

        {/* Jenis Dokumen */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Jenis Dokumen <span className="text-red-500">*</span>
          </label>
          <select
            name="type_id"
            required
            value={selectedTypeId}
            onChange={(e) => setSelectedTypeId(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
          >
            <option value="">Pilih Jenis Dokumen</option>
            {filteredTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>

        {selectedTypeId && (
          <>
            {/* No. Dokumen */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                No. Dokumen <span className="text-red-500">*</span>
              </label>
              <input
                name="doc_number"
                required
                placeholder="contoh: EXT-001"
                className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
              />
            </div>

            {/* Judul Dokumen */}
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

            {/* No. Order (KAL) */}
            {cfg.showNoOrder && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  No. Order{" "}
                  <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  name="no_order"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>
            )}

            {/* Sumber */}
            {cfg.showSource && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Sumber (dari PT mana){" "}
                  {cfg.sourceRequired ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (opsional)
                    </span>
                  )}
                </label>
                <input
                  name="source"
                  required={cfg.sourceRequired}
                  placeholder="contoh: PT. ABC Indonesia"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>
            )}

            {/* Revisi (ITP) */}
            {cfg.showRevision && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Revisi ke-
                </label>
                <input
                  name="revision"
                  type="number"
                  min={0}
                  defaultValue={0}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>
            )}

            {/* Tanggal (COA, DIU, TES) */}
            {cfg.showTanggal && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tanggal{" "}
                  {cfg.tanggalRequired ? (
                    <span className="text-red-500">*</span>
                  ) : (
                    <span className="text-slate-400 font-normal">
                      (opsional)
                    </span>
                  )}
                </label>
                <input
                  name="effective_date"
                  type="date"
                  required={cfg.tanggalRequired}
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>
            )}

            {/* Tgl Efektif (ITP) — opsional */}
            {cfg.showTglEfektif && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Tgl Efektif{" "}
                  <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  name="effective_date"
                  type="date"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>
            )}

            {/* Test Report Number (TES) — opsional */}
            {cfg.showTestReportNo && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Test Report Number{" "}
                  <span className="text-slate-400 font-normal">(opsional)</span>
                </label>
                <input
                  name="test_report_no"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>
            )}

            {/* KAL Fields */}
            {cfg.isKal && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Jenis{" "}
                    <span className="text-slate-400 font-normal">
                      (opsional)
                    </span>
                  </label>
                  <input
                    name="item_type"
                    placeholder="Opsional"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Merek{" "}
                    <span className="text-slate-400 font-normal">
                      (opsional)
                    </span>
                  </label>
                  <input
                    name="brand"
                    placeholder="Opsional"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tipe/Model{" "}
                    <span className="text-slate-400 font-normal">
                      (opsional)
                    </span>
                  </label>
                  <input
                    name="model"
                    placeholder="Opsional"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    No. Seri{" "}
                    <span className="text-slate-400 font-normal">
                      (opsional)
                    </span>
                  </label>
                  <input
                    name="serial_no"
                    placeholder="Opsional"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tgl Kalibrasi{" "}
                    <span className="text-slate-400 font-normal">
                      (opsional)
                    </span>
                  </label>
                  <input
                    name="calibration_date"
                    type="date"
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Tgl Pengujian / Masa Berlaku{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="expiry_date"
                    type="date"
                    required={cfg.expiryDateRequired}
                    className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                  />
                </div>
              </div>
            )}

            {/* Status */}
            {cfg.showStatus && (
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Status <span className="text-red-500">*</span>
                </label>
                <select
                  name="status"
                  required
                  defaultValue="terbaru"
                  className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <a
            href={redirectPath}
            className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Batal
          </a>
          <button
            type="submit"
            disabled={isPending || !selectedTypeId}
            className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
          >
            {isPending ? "Menyimpan..." : "Simpan Dokumen"}
          </button>
        </div>
      </form>

      {/* Modal Import */}
      {showImport && (
        <ImportExternalDocumentModal
          documentTypes={filteredTypes}
          categoryId={categoryId || selectedCategoryId}
          uploadedBy={userId}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            window.location.href = redirectPath;
          }}
        />
      )}
    </>
  );
}
