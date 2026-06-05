"use client";

import { useState, useTransition } from "react";
import { updateExternalDocument } from "@/app/lib/actions";

type DocType = { id: string; name: string; category_id: string };
type Department = { id: string; code: string; name: string };

interface ExternalDocument {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
  status: string;
  category_id: string;
  category_name: string;
  type_id: string;
  type_name: string;
  effective_date: string | null;
  expiry_date: string | null;
  source: string | null;
  test_report_no: string | null;
  no_order: string | null;
  item_type: string | null;
  brand: string | null;
  model: string | null;
  serial_no: string | null;
  calibration_date: string | null;
}

interface Props {
  document: ExternalDocument;
  documentTypes: DocType[];
  redirectPath?: string;
}

function getFieldConfig(typeName: string) {
  const t = typeName.toLowerCase();
  return {
    showSource: ["coa", "diu", "itp", "pip", "spk", "tes"].includes(t),
    showTanggal: ["coa", "diu", "tes"].includes(t), // → effective_date
    showRevision: t === "itp",
    showTglEfektif: t === "itp", // → effective_date
    showStatus: ["itp", "kal", "tes"].includes(t), // COA, DIU, PIP, SPK tidak ada status
    showTestReportNo: t === "tes",
    showNoOrder: t === "kal",
    showItemType: t === "kal",
    showBrand: t === "kal",
    showModel: t === "kal",
    showSerialNo: t === "kal",
    showCalibrationDate: t === "kal",
    showExpiryDate: t === "kal",
    isKal: t === "kal",
  };
}

const STATUS_OPTIONS = [
  { value: "terbaru", label: "Terbaru" },
  { value: "kadaluarsa", label: "Kadaluarsa" },
];

export default function EditExternalDocumentClient({
  document,
  documentTypes,
  redirectPath = "/dashboard/dokumen-eksternal",
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState(document.type_id);

  const filteredTypes = documentTypes.filter(
    (t) => t.category_id === document.category_id
  );
  const selectedType = documentTypes.find((t) => t.id === selectedTypeId);
  const cfg = getFieldConfig(selectedType?.name ?? document.type_name);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    formData.set("type_name", selectedType?.name ?? document.type_name);
    startTransition(async () => {
      const result = await updateExternalDocument(document.id, formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      window.location.href = redirectPath;
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <input type="hidden" name="doc_number" value={document.doc_number} />

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
          {filteredTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      {/* No. Dokumen — readonly */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          No. Dokumen
        </label>
        <input
          type="text"
          value={document.doc_number}
          readOnly
          className="w-full border border-slate-200 bg-slate-50 rounded-lg px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed"
        />
        <p className="text-xs text-slate-400 mt-1">
          Nomor dokumen tidak dapat diubah.
        </p>
      </div>

      {/* Judul Dokumen */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Judul Dokumen <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          required
          defaultValue={document.title}
          className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
      </div>

      {/* No. Order (KAL) */}
      {cfg.showNoOrder && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            No. Order <span className="text-red-500">*</span>
          </label>
          <input
            name="no_order"
            required
            defaultValue={document.no_order ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      )}

      {/* Sumber */}
      {cfg.showSource && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Sumber (dari PT mana) <span className="text-red-500">*</span>
          </label>
          <input
            name="source"
            required
            defaultValue={document.source ?? ""}
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
            defaultValue={document.revision}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      )}

      {/* Tanggal (COA, DIU, TES) */}
      {cfg.showTanggal && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tanggal <span className="text-red-500">*</span>
          </label>
          <input
            name="effective_date"
            type="date"
            required
            defaultValue={document.effective_date ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      )}

      {/* Tgl Efektif (ITP) */}
      {cfg.showTglEfektif && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tgl Efektif <span className="text-red-500">*</span>
          </label>
          <input
            name="effective_date"
            type="date"
            required
            defaultValue={document.effective_date ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      )}

      {/* Test Report Number (TES) */}
      {cfg.showTestReportNo && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Test Report Number <span className="text-red-500">*</span>
          </label>
          <input
            name="test_report_no"
            required
            defaultValue={document.test_report_no ?? ""}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      )}

      {/* KAL Fields */}
      {cfg.isKal && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Jenis
            </label>
            <input
              name="item_type"
              defaultValue={document.item_type ?? ""}
              placeholder="Opsional"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Merek
            </label>
            <input
              name="brand"
              defaultValue={document.brand ?? ""}
              placeholder="Opsional"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tipe/Model
            </label>
            <input
              name="model"
              defaultValue={document.model ?? ""}
              placeholder="Opsional"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              No. Seri
            </label>
            <input
              name="serial_no"
              defaultValue={document.serial_no ?? ""}
              placeholder="Opsional"
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tgl Kalibrasi
            </label>
            <input
              name="calibration_date"
              type="date"
              defaultValue={document.calibration_date ?? ""}
              className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tgl Pengujian / Masa Berlaku
            </label>
            <input
              name="expiry_date"
              type="date"
              defaultValue={document.expiry_date ?? ""}
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
            defaultValue={document.status}
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
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
        >
          {isPending ? "Menyimpan..." : "Simpan Perubahan"}
        </button>
      </div>
    </form>
  );
}
