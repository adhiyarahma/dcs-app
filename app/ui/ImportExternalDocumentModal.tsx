"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  parseExternalImportData,
  importExternalDocuments,
  ExternalImportRow,
  ExternalImportRowError,
} from "../lib/actions";
import { ArrowDownTrayIcon } from "@heroicons/react/24/outline";

type DocType = { id: string; name: string; category_id: string };

interface Props {
  documentTypes: DocType[]; // sudah difilter per category_id eksternal
  categoryId: string;
  uploadedBy: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "select" | "upload" | "preview" | "done";

// Label jenis dokumen untuk tampilan
const TYPE_LABELS: Record<string, string> = {
  coa: "COA — Certificate of Analysis",
  diu: "DIU — Dokumen Informasi Umum",
  itp: "ITP — Informasi Teknik Produk",
  kal: "KAL — Hasil Kalibrasi",
  pip: "PIP — Petunjuk Instruksi Penggunaan",
  spk: "SPK — Spesifikasi",
  tes: "TES — Hasil Pengetesan Eksternal",
};

export default function ImportExternalDocumentModal({
  documentTypes,
  categoryId,
  uploadedBy,
  onClose,
  onSuccess,
}: Props) {
  const [step, setStep] = useState<Step>("select");
  const [typeId, setTypeId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseErrors, setParseErrors] = useState<ExternalImportRowError[]>([]);
  const [validRows, setValidRows] = useState<ExternalImportRow[]>([]);
  const [importResult, setImportResult] = useState<{ count: number } | null>(
    null
  );
  const [globalError, setGlobalError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedType = documentTypes.find((t) => t.id === typeId);
  const typeName = selectedType?.name ?? "";
  const typeKey = typeName.toLowerCase();

  // ── Download template ──────────────────────────────────────
  const handleDownloadTemplate = () => {
    if (!typeId || !selectedType) return;
    const url = `/api/documents/template?type=${encodeURIComponent(
      typeName
    )}&category=Dokumen Eksternal`;
    window.open(url, "_blank");
  };

  // ── Parse Excel ───────────────────────────────────────────
  const processFile = useCallback(
    async (file: File) => {
      if (!file.name.endsWith(".xlsx") && !file.name.endsWith(".xls")) {
        setGlobalError("File harus berformat .xlsx atau .xls");
        return;
      }

      setIsLoading(true);
      setGlobalError("");
      setParseErrors([]);
      setValidRows([]);

      try {
        const buffer = await file.arrayBuffer();
        const wb = XLSX.read(buffer, { type: "array", cellDates: false });
        const ws = wb.Sheets[wb.SheetNames[0]];

        // Cari baris header (cari "Judul Dokumen")
        const previewArray = XLSX.utils.sheet_to_json(ws, {
          header: 1,
        }) as unknown[][];
        let headerRowIndex = -1;
        for (let i = 0; i < previewArray.length; i++) {
          if ((previewArray[i] as string[]).includes("Judul Dokumen")) {
            headerRowIndex = i;
            break;
          }
        }

        if (headerRowIndex === -1) {
          setGlobalError(
            'Format template salah. Kolom "Judul Dokumen" tidak ditemukan.'
          );
          setIsLoading(false);
          return;
        }

        // Parse dari baris header, skip sub-header "(wajib diisi)"
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
          range: headerRowIndex,
          defval: "",
        });
        const dataRows = raw.slice(1); // skip sub-header

        if (dataRows.length === 0) {
          setGlobalError("File tidak mengandung data.");
          setIsLoading(false);
          return;
        }

        const plainRows = JSON.parse(JSON.stringify(dataRows));

        const result = await parseExternalImportData(
          plainRows,
          typeName,
          typeId,
          categoryId,
          uploadedBy
        );

        if (!result.success) {
          setGlobalError(result.error);
        } else {
          setParseErrors(result.errors);
          setValidRows(result.rows);
          setStep("preview");
        }
      } catch {
        setGlobalError("Gagal membaca file. Pastikan format file benar.");
      } finally {
        setIsLoading(false);
      }
    },
    [typeId, typeName, categoryId, uploadedBy]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processFile(file);
  };

  // ── Import ke DB ──────────────────────────────────────────
  const handleImport = async () => {
    if (!validRows.length) return;
    setIsLoading(true);
    setGlobalError("");

    const result = await importExternalDocuments(validRows);
    setIsLoading(false);

    if (!result.success) {
      setGlobalError(result.error);
    } else {
      setImportResult({ count: result.count });
      setStep("done");
      onSuccess();
    }
  };

  // ── Kolom preview per jenis ───────────────────────────────
  const previewCols = () => {
    const base = [
      { key: "doc_number", label: "No. Dokumen" },
      { key: "title", label: "Judul Dokumen" },
      { key: "source", label: "Keterangan" },
    ];
    if (typeKey === "coa" || typeKey === "diu" || typeKey === "tes")
      base.push({ key: "effective_date", label: "Tanggal" });
    if (typeKey === "itp") {
      base.push({ key: "revision", label: "Revisi" });
      base.push({ key: "effective_date", label: "Tgl Efektif" });
    }
    if (typeKey === "tes")
      base.push({ key: "test_report_no", label: "Test Report No." });
    if (typeKey === "kal") {
      base.push({ key: "expiry_date", label: "Tgl Pengujian" });
      base.push({ key: "brand", label: "Merek" });
      base.push({ key: "model", label: "Model" });
    }
    base.push({ key: "status", label: "Status" });
    return base;
  };

  const STEPS: Step[] = ["select", "upload", "preview", "done"];
  const STEP_LABELS: Record<Step, string> = {
    select: "Pilih Jenis",
    upload: "Upload",
    preview: "Preview",
    done: "Selesai",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              Import Dokumen Eksternal dari Excel
            </h2>
            <div className="flex items-center gap-1.5 mt-1.5">
              {STEPS.map((s, i) => (
                <span key={s} className="flex items-center gap-1">
                  <span
                    className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      step === s
                        ? "bg-slate-900 text-white"
                        : STEPS.indexOf(step) > i
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {i + 1}. {STEP_LABELS[s]}
                  </span>
                  {i < 3 && <span className="text-slate-300 text-xs">›</span>}
                </span>
              ))}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* STEP: select */}
          {step === "select" && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Jenis Dokumen Eksternal
                </label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="w-full border border-slate-300 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                >
                  <option value="">-- Pilih Jenis Dokumen --</option>
                  {documentTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {typeId && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-sm font-medium text-blue-800">
                      Template untuk:{" "}
                      <span className="font-bold">{typeName}</span>
                    </p>
                    <p className="text-xs text-blue-600 mt-0.5">
                      {TYPE_LABELS[typeKey] ?? typeName}
                    </p>
                  </div>

                  {/* Preview kolom */}
                  <div>
                    <p className="text-xs font-semibold text-blue-700 mb-1.5">
                      Kolom yang akan ada di template:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {previewCols().map((col) => (
                        <span
                          key={col.key}
                          className="text-[11px] bg-white border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-medium"
                        >
                          {col.label}
                        </span>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                    Download Template — {typeName}
                  </button>
                  <p className="text-xs text-blue-500">
                    Isi template lalu upload di langkah berikutnya.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* STEP: upload */}
          {step === "upload" && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                <p className="text-xs text-slate-500">
                  Jenis dokumen:{" "}
                  <span className="font-bold text-slate-700">{typeName}</span>
                </p>
              </div>
              <p className="text-sm text-slate-600">
                Upload file Excel yang sudah diisi. Pastikan menggunakan
                template yang sudah didownload.
              </p>

              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragging(true);
                }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all ${
                  isDragging
                    ? "border-blue-500 bg-blue-50"
                    : "border-slate-300 hover:border-blue-400 hover:bg-slate-50"
                } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-emerald-600"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                      />
                    </svg>
                  </div>
                  {isLoading ? (
                    <p className="text-sm text-slate-500">Memproses file...</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-slate-700">
                        Drag & drop file Excel di sini
                      </p>
                      <p className="text-xs text-slate-400">
                        atau klik untuk memilih file (.xlsx, .xls)
                      </p>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              {globalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {globalError}
                </div>
              )}
            </div>
          )}

          {/* STEP: preview */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Ringkasan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-emerald-600">
                    {validRows.length}
                  </p>
                  <p className="text-sm text-emerald-700 mt-1">
                    Baris valid siap diimport
                  </p>
                </div>
                <div
                  className={`border rounded-xl p-4 text-center ${
                    parseErrors.length > 0
                      ? "bg-red-50 border-red-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p
                    className={`text-3xl font-bold ${
                      parseErrors.length > 0 ? "text-red-600" : "text-slate-400"
                    }`}
                  >
                    {parseErrors.length}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      parseErrors.length > 0 ? "text-red-700" : "text-slate-400"
                    }`}
                  >
                    {parseErrors.length > 0
                      ? "Error ditemukan"
                      : "Tidak ada error"}
                  </p>
                </div>
              </div>

              {/* Error list */}
              {parseErrors.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-red-700 mb-2">
                    ⚠ Baris dengan error (tidak akan diimport):
                  </h3>
                  <div className="max-h-40 overflow-y-auto border border-red-200 rounded-xl">
                    <table className="w-full text-xs">
                      <thead className="bg-red-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-red-700 font-medium">
                            Baris Excel
                          </th>
                          <th className="px-3 py-2 text-left text-red-700 font-medium">
                            Kolom
                          </th>
                          <th className="px-3 py-2 text-left text-red-700 font-medium">
                            Masalah
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {parseErrors.map((err, i) => (
                          <tr
                            key={i}
                            className={
                              i % 2 === 0 ? "bg-white" : "bg-red-50/40"
                            }
                          >
                            <td className="px-3 py-1.5 font-mono text-red-600">
                              Baris {err.row}
                            </td>
                            <td className="px-3 py-1.5 text-slate-700">
                              {err.field}
                            </td>
                            <td className="px-3 py-1.5 text-slate-600">
                              {err.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">
                    Perbaiki file Excel dan upload ulang untuk mengimport baris
                    yang error.
                  </p>
                </div>
              )}

              {/* Preview data valid */}
              {validRows.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">
                    Preview data yang akan diimport:
                  </h3>
                  <div className="max-h-52 overflow-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead className="bg-slate-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-slate-600 font-medium">
                            #
                          </th>
                          {previewCols().map((col) => (
                            <th
                              key={col.key}
                              className="px-3 py-2 text-left text-slate-600 font-medium"
                            >
                              {col.label}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.map((row, i) => (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? "bg-white" : "bg-slate-50"}
                          >
                            <td className="px-3 py-1.5 text-slate-400">
                              {i + 1}
                            </td>
                            {previewCols().map((col) => (
                              <td
                                key={col.key}
                                className="px-3 py-1.5 text-slate-700 max-w-[180px] truncate"
                              >
                                {col.key === "status" ? (
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                      (row as any)[col.key] === "terbaru"
                                        ? "bg-emerald-100 text-emerald-700"
                                        : "bg-amber-100 text-amber-700"
                                    }`}
                                  >
                                    {(row as any)[col.key]}
                                  </span>
                                ) : (
                                  String((row as any)[col.key] ?? "—")
                                )}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {globalError && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                  {globalError}
                </div>
              )}
            </div>
          )}

          {/* STEP: done */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-emerald-600"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-slate-800">
                Import Berhasil!
              </h3>
              <p className="text-slate-600 text-center">
                <span className="font-bold text-emerald-600">
                  {importResult?.count} dokumen
                </span>{" "}
                berhasil diimport ke sistem.
              </p>
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <div>
            {step !== "select" && step !== "done" && (
              <button
                onClick={() => {
                  setGlobalError("");
                  setStep(step === "upload" ? "select" : "upload");
                }}
                className="text-sm text-slate-500 hover:text-slate-700 font-medium"
              >
                ← Kembali
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 font-medium"
            >
              {step === "done" ? "Tutup" : "Batal"}
            </button>

            {step === "select" && (
              <button
                onClick={() => setStep("upload")}
                disabled={!typeId}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
              >
                Lanjut →
              </button>
            )}

            {step === "upload" && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-5 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {isLoading ? "Memproses..." : "Pilih File"}
              </button>
            )}

            {step === "preview" && validRows.length > 0 && (
              <button
                onClick={handleImport}
                disabled={isLoading}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors"
              >
                {isLoading
                  ? "Mengimport..."
                  : `Import ${validRows.length} Dokumen`}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
