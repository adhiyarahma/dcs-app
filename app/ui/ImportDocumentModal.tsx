"use client";

import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import {
  parseImportData,
  importDocuments,
  ImportPreviewRow,
  ImportRowError,
} from "../lib/actions";

// ── Types ──
type Category = { id: string; name: string };
type DocumentType = { id: string; name: string; category_id: string };
type Department = { id: string; code: string; name: string };

interface ImportDocumentModalProps {
  categories: Category[];
  documentTypes: DocumentType[];
  uploadedBy: string;
  onClose: () => void;
  onSuccess: () => void;
}

type Step = "select" | "upload" | "preview" | "done";

// ============================================================
export default function ImportDocumentModal({
  categories,
  documentTypes,
  uploadedBy,
  onClose,
  onSuccess,
}: ImportDocumentModalProps) {
  const [step, setStep] = useState<Step>("select");
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [parseErrors, setParseErrors] = useState<ImportRowError[]>([]);
  const [validRows, setValidRows] = useState<ImportPreviewRow[]>([]);
  const [importResult, setImportResult] = useState<{ count: number } | null>(
    null
  );
  const [globalError, setGlobalError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Derived
  const selectedCategory = categories.find((c) => c.id === categoryId);
  const filteredTypes = documentTypes.filter(
    (t) => t.category_id === categoryId
  );
  const selectedType = documentTypes.find((t) => t.id === typeId);

  // ── Step 1: Download Template ──
  const handleDownloadTemplate = () => {
    if (!categoryId || !typeId || !selectedCategory || !selectedType) return;
    const url = `/api/documents/template?type=${encodeURIComponent(
      selectedType.name
    )}&category=${encodeURIComponent(selectedCategory.name)}`;
    window.open(url, "_blank");
  };

  // ── Step 2: Parse Excel ──
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

        // 1. BACA PREVIEW UNTUK MENCARI POSISI HEADER
        // Kita cari di baris ke berapa kolom "Judul Dokumen" berada
        const previewArray = XLSX.utils.sheet_to_json(ws, {
          header: 1,
        }) as unknown[][];
        let headerRowIndex = -1;

        for (let i = 0; i < previewArray.length; i++) {
          const rowData = previewArray[i] as string[];
          if (rowData && rowData.includes("Judul Dokumen")) {
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

        // 2. PARSE EXCEL DENGAN RANGE YANG TEPAT
        // Setelah tahu posisi header, kita baca datanya mulai dari baris tersebut
        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
          range: headerRowIndex,
          defval: "",
        });

        // 3. LEWATI SUB-HEADER
        // Baris pertama setelah header adalah teks "(wajib diisi)", jadi kita potong/buang
        const dataRows = raw.slice(1);

        if (dataRows.length === 0) {
          setGlobalError("File tidak mengandung data.");
          setIsLoading(false);
          return;
        }

        // 4. STERILISASI DATA
        // Konversi ke plain object murni agar Server Action Next.js tidak error
        const plainDataRows = JSON.parse(JSON.stringify(dataRows));

        const result = await parseImportData(
          plainDataRows,
          selectedType!.name,
          categoryId,
          typeId,
          uploadedBy
        );

        if (!result.success) {
          setGlobalError(result.error);
        } else {
          setParseErrors(result.errors);
          setValidRows(result.rows);
          setStep("preview");
        }
      } catch (e) {
        setGlobalError("Gagal membaca file. Pastikan format file benar.");
      } finally {
        setIsLoading(false);
      }
    },
    [categoryId, typeId, selectedType, uploadedBy]
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

  // ── Step 3: Import ──
  const handleImport = async () => {
    if (!validRows.length) return;
    setIsLoading(true);
    setGlobalError("");

    const result = await importDocuments(validRows);
    setIsLoading(false);

    if (!result.success) {
      setGlobalError(result.error);
    } else {
      setImportResult({ count: result.count });
      setStep("done");
      onSuccess();
    }
  };

  // ── Render ──
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2 className="text-lg font-semibold text-gray-800">
              Import Dokumen dari Excel
            </h2>
            <div className="flex items-center gap-2 mt-1">
              {(["select", "upload", "preview", "done"] as Step[]).map(
                (s, i) => (
                  <span key={s} className="flex items-center gap-1">
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        step === s
                          ? "bg-blue-600 text-white"
                          : ["select", "upload", "preview", "done"].indexOf(
                              step
                            ) > i
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      {i + 1}.{" "}
                      {
                        {
                          select: "Pilih Jenis",
                          upload: "Upload",
                          preview: "Preview",
                          done: "Selesai",
                        }[s]
                      }
                    </span>
                    {i < 3 && <span className="text-gray-300 text-xs">›</span>}
                  </span>
                )
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {/* ── Step: select ── */}
          {step === "select" && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategori Dokumen
                </label>
                <select
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    setTypeId("");
                  }}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">-- Pilih Kategori --</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Jenis Dokumen
                </label>
                <select
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  disabled={!categoryId}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400"
                >
                  <option value="">-- Pilih Jenis Dokumen --</option>
                  {filteredTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>

              {categoryId && typeId && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                  <p className="text-sm text-blue-700 font-medium mb-2">
                    Download template Excel untuk jenis dokumen ini:
                  </p>
                  <button
                    onClick={handleDownloadTemplate}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
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
                        d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                      />
                    </svg>
                    Download Template — {selectedType?.name}
                  </button>
                  <p className="text-xs text-blue-500 mt-2">
                    Isi template lalu upload kembali di langkah berikutnya.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Step: upload ── */}
          {step === "upload" && (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
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
                    : "border-gray-300 hover:border-blue-400 hover:bg-gray-50"
                } ${isLoading ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-600"
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
                    <p className="text-sm text-gray-500">Memproses file...</p>
                  ) : (
                    <>
                      <p className="text-sm font-medium text-gray-700">
                        Drag & drop file Excel di sini
                      </p>
                      <p className="text-xs text-gray-400">
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
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {globalError}
                </div>
              )}
            </div>
          )}

          {/* ── Step: preview ── */}
          {step === "preview" && (
            <div className="space-y-4">
              {/* Ringkasan */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {validRows.length}
                  </p>
                  <p className="text-sm text-green-700 mt-1">
                    Baris valid siap diimport
                  </p>
                </div>
                <div
                  className={`border rounded-xl p-4 text-center ${
                    parseErrors.length > 0
                      ? "bg-red-50 border-red-200"
                      : "bg-gray-50 border-gray-200"
                  }`}
                >
                  <p
                    className={`text-3xl font-bold ${
                      parseErrors.length > 0 ? "text-red-600" : "text-gray-400"
                    }`}
                  >
                    {parseErrors.length}
                  </p>
                  <p
                    className={`text-sm mt-1 ${
                      parseErrors.length > 0 ? "text-red-700" : "text-gray-400"
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
                  <div className="max-h-40 overflow-y-auto border border-red-200 rounded-lg">
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
                            <td className="px-3 py-1.5 text-gray-700">
                              {err.field}
                            </td>
                            <td className="px-3 py-1.5 text-gray-600">
                              {err.message}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Perbaiki file Excel dan upload ulang untuk mengimport baris
                    yang error.
                  </p>
                </div>
              )}

              {/* Preview data valid */}
              {validRows.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">
                    Preview data yang akan diimport:
                  </h3>
                  <div className="max-h-48 overflow-auto border border-gray-200 rounded-lg">
                    <table className="w-full text-xs whitespace-nowrap">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">
                            No
                          </th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">
                            Judul Dokumen
                          </th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">
                            No. Dokumen
                          </th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">
                            Revisi
                          </th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">
                            Tgl Efektif
                          </th>
                          <th className="px-3 py-2 text-left text-gray-600 font-medium">
                            Status
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {validRows.map((row, i) => (
                          <tr
                            key={i}
                            className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                          >
                            <td className="px-3 py-1.5 text-gray-500">
                              {row.no}
                            </td>
                            <td className="px-3 py-1.5 text-gray-800 max-w-[200px] truncate">
                              {row.title}
                            </td>
                            <td className="px-3 py-1.5 font-mono text-gray-600">
                              {row.doc_number}
                            </td>
                            <td className="px-3 py-1.5 text-center">
                              {row.revision}
                            </td>
                            <td className="px-3 py-1.5 text-gray-600">
                              {row.effective_date}
                            </td>
                            <td className="px-3 py-1.5">
                              <span
                                className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                  row.status === "terbaru"
                                    ? "bg-green-100 text-green-700"
                                    : row.status === "kadaluarsa"
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {row.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {globalError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                  {globalError}
                </div>
              )}
            </div>
          )}

          {/* ── Step: done ── */}
          {step === "done" && (
            <div className="flex flex-col items-center justify-center py-10 gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-green-600"
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
              <h3 className="text-xl font-semibold text-gray-800">
                Import Berhasil!
              </h3>
              <p className="text-gray-600 text-center">
                <span className="font-bold text-green-600">
                  {importResult?.count} dokumen
                </span>{" "}
                berhasil diimport ke sistem.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div>
            {step !== "select" && step !== "done" && (
              <button
                onClick={() => {
                  setGlobalError("");
                  setStep(step === "upload" ? "select" : "upload");
                }}
                className="text-sm text-gray-500 hover:text-gray-700 font-medium"
              >
                ← Kembali
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              {step === "done" ? "Tutup" : "Batal"}
            </button>

            {step === "select" && (
              <button
                onClick={() => setStep("upload")}
                disabled={!categoryId || !typeId}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                Lanjut →
              </button>
            )}

            {step === "upload" && (
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isLoading ? "Memproses..." : "Pilih File"}
              </button>
            )}

            {step === "preview" && validRows.length > 0 && (
              <button
                onClick={handleImport}
                disabled={isLoading}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white text-sm font-medium rounded-lg transition-colors"
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
