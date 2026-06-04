"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import * as XLSX from "xlsx";
import clsx from "clsx";
import {
  XMarkIcon,
  ArrowUpTrayIcon,
  DocumentArrowDownIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from "@heroicons/react/24/outline";
import {
  createDistribution,
  type DistributionItemInput,
} from "@/app/lib/actions";

// ─── Types ────────────────────────────────────────────────────────────────────
type Head = { name: string; title: string | null };
type Dept = { id: string; code: string; name: string; heads?: Head[] };
type DocOption = {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
};

interface RawRow {
  no_form: string;
  tanggal_distribusi: string;
  diserahkan_oleh: string;
  nomor_dokumen: string;
  revisi: number;
  tanggal_dokumen: string;
  dept_penerima: string;
  qty: number;
  catatan: string;
  _row: number;
}

interface ParsedForm {
  form_number: string;
  distributed_date: string;
  handed_by_dept_id: string;
  handed_by_dept_code: string;
  notes: string;
  items: ParsedItem[];
  errors: string[];
  warnings: string[];
}

interface ParsedItem {
  document_id: string;
  doc_number: string;
  doc_title: string;
  revision: number;
  distributed_date: string | null;
  recipients: { dept_id: string; dept_code: string; qty: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeDate(raw: unknown): string {
  if (!raw) return "";
  if (raw instanceof Date) {
    return raw.toISOString().split("T")[0];
  }
  if (typeof raw === "number") {
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  const s = String(raw).trim();
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy)
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  return s;
}

function formatDateDisplay(s: string) {
  if (!s) return "-";
  try {
    return new Date(s).toLocaleDateString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return s;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function ImportDistributionModal({
  onClose,
  departments,
  docOptions,
  currentUserId,
}: {
  onClose: () => void;
  departments: Dept[];
  docOptions: DocOption[];
  currentUserId: string;
}) {
  // ── Fetch semua dokumen (termasuk kadaluarsa) saat modal dibuka ─────────────
  const [allDocOptions, setAllDocOptions] = useState<DocOption[]>([]);
  const [loadingDocs, setLoadingDocs] = useState(true);

  useEffect(() => {
    fetch("/api/documents/all")
      .then((r) => r.json())
      .then((data: DocOption[]) => {
        setAllDocOptions(data);
        setLoadingDocs(false);
      })
      .catch(() => {
        // fallback ke docOptions prop (hanya terbaru) jika fetch gagal
        setAllDocOptions(docOptions);
        setLoadingDocs(false);
      });
  }, []);

  // Pre-compute data untuk template dropdown
  const dccHeads: string[] = departments
    .filter((d) => d.code === "DCC")
    .flatMap((d) => (d.heads ?? []).map((h) => h.name))
    .filter(Boolean);

  const deptOptions: string[] = departments.flatMap((dept) => {
    if (!dept.heads || dept.heads.length === 0) return [dept.code];
    return dept.heads.map((h) => `${dept.code} - ${h.name}`);
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">(
    "upload"
  );
  const [parseError, setParseError] = useState("");
  const [forms, setForms] = useState<ParsedForm[]>([]);
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<
    { form_number: string; success: boolean; error?: string }[]
  >([]);
  const [downloadingTemplate, setDownloadingTemplate] = useState(false);

  // ── Lookup helpers ──────────────────────────────────────────────────────────
  function findDept(raw: string): Dept | undefined {
    const normalized = raw.trim().toLowerCase();

    const byCode = departments.find((d) => d.code.toLowerCase() === normalized);
    if (byCode) return byCode;

    const dashIdx = raw.indexOf(" - ");
    if (dashIdx !== -1) {
      const code = raw.slice(0, dashIdx).trim().toLowerCase();
      const headName = raw
        .slice(dashIdx + 3)
        .trim()
        .toLowerCase();

      const dept = departments.find(
        (d) =>
          d.code.toLowerCase() === code &&
          (d.heads ?? []).some((h) => h.name.toLowerCase() === headName)
      );
      if (dept) return dept;

      const byCodeOnly = departments.find((d) => d.code.toLowerCase() === code);
      if (byCodeOnly) return byCodeOnly;
    }

    const byHeadName = departments.find((d) =>
      (d.heads ?? []).some((h) => h.name.toLowerCase() === normalized)
    );
    if (byHeadName) return byHeadName;

    return undefined;
  }

  function findDoc(docNumber: string, revision: number): DocOption | undefined {
    const normalized = docNumber.trim().toLowerCase();

    // 1. Exact match nomor + revisi
    const byBoth = allDocOptions.find(
      (d) =>
        d.doc_number.toLowerCase() === normalized && d.revision === revision
    );
    if (byBoth) return byBoth;

    // 2. Fallback: revisi tertinggi dengan nomor yang sama
    const candidates = allDocOptions
      .filter((d) => d.doc_number.toLowerCase() === normalized)
      .sort((a, b) => b.revision - a.revision);

    return candidates[0];
  }

  // ── Download template ───────────────────────────────────────────────────────
  async function downloadTemplate() {
    setDownloadingTemplate(true);
    try {
      const res = await fetch("/api/distributions/template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dcc_heads: dccHeads,
          dept_options: deptOptions,
        }),
      });
      if (!res.ok) throw new Error("Gagal generate template");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_distribusi.xlsx";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Gagal download template. Coba lagi.");
    } finally {
      setDownloadingTemplate(false);
    }
  }

  // ── Parse Excel ─────────────────────────────────────────────────────────────
  function parseExcel(file: File) {
    setParseError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });

        const sheetName =
          wb.SheetNames.find((n) => !n.toLowerCase().includes("petunjuk")) ??
          wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        const raw: Record<string, unknown>[] = XLSX.utils.sheet_to_json(ws, {
          header: [
            "no_form",
            "tanggal_distribusi",
            "diserahkan_oleh",
            "nomor_dokumen",
            "revisi",
            "tanggal_dokumen",
            "dept_penerima",
            "qty",
            "catatan",
          ],
          range: 4,
          defval: "",
        });

        const rows: RawRow[] = raw
          .map((r, i) => ({
            no_form: String(r.no_form ?? "").trim(),
            tanggal_distribusi: normalizeDate(r.tanggal_distribusi),
            diserahkan_oleh: String(r.diserahkan_oleh ?? "").trim(),
            nomor_dokumen: String(r.nomor_dokumen ?? "").trim(),
            revisi: parseInt(String(r.revisi ?? "0")) || 0,
            tanggal_dokumen: normalizeDate(r.tanggal_dokumen),
            dept_penerima: String(r.dept_penerima ?? "").trim(),
            qty: Math.max(1, parseInt(String(r.qty ?? "1")) || 1),
            catatan: String(r.catatan ?? "").trim(),
            _row: i + 5,
          }))
          .filter((r) => r.no_form || r.nomor_dokumen || r.dept_penerima);

        if (rows.length === 0) {
          setParseError(
            "Tidak ada data yang ditemukan. Pastikan file menggunakan template yang benar dan ada data mulai baris ke-5."
          );
          return;
        }

        const formMap = new Map<string, RawRow[]>();
        rows.forEach((r) => {
          if (!formMap.has(r.no_form)) formMap.set(r.no_form, []);
          formMap.get(r.no_form)!.push(r);
        });

        const parsedForms: ParsedForm[] = [];

        formMap.forEach((formRows, formNumber) => {
          const errors: string[] = [];
          const warnings: string[] = [];
          const firstRow = formRows[0];

          if (!formNumber) errors.push("Nomor form kosong.");
          if (!firstRow.tanggal_distribusi)
            errors.push("Tanggal distribusi tidak valid atau kosong.");
          if (!firstRow.diserahkan_oleh)
            errors.push("Kolom 'Diserahkan Oleh' kosong.");

          const handedDept = findDept(firstRow.diserahkan_oleh);
          if (!handedDept)
            errors.push(
              `Departemen pengirim "${firstRow.diserahkan_oleh}" tidak ditemukan di database.`
            );

          const docMap = new Map<string, RawRow[]>();
          formRows.forEach((r) => {
            if (!r.nomor_dokumen) {
              errors.push(`Baris ${r._row}: Nomor dokumen kosong.`);
              return;
            }
            const key = `${r.nomor_dokumen}__rev${r.revisi}`;
            if (!docMap.has(key)) docMap.set(key, []);
            docMap.get(key)!.push(r);
          });

          const items: ParsedItem[] = [];

          docMap.forEach((docRows) => {
            const firstDocRow = docRows[0];
            const docNumber = firstDocRow.nomor_dokumen;
            const revisi = firstDocRow.revisi;
            const doc = findDoc(docNumber, revisi);
            if (!doc) {
              const revLabel = revisi
                ? ` Rev.${revisi}`
                : " (revisi tidak ditemukan)";
              errors.push(
                `Dokumen "${docNumber}"${revLabel} tidak ditemukan di database.`
              );
              return;
            }

            const overrideDateRaw = docRows[0].tanggal_dokumen;
            const overrideDate =
              overrideDateRaw && overrideDateRaw !== firstRow.tanggal_distribusi
                ? overrideDateRaw
                : null;

            if (
              overrideDate &&
              docRows.some((r) => r.tanggal_dokumen !== overrideDateRaw)
            )
              warnings.push(
                `Dokumen "${docNumber}" Rev.${revisi} memiliki tanggal override tidak konsisten; digunakan nilai baris pertama.`
              );

            const recipients: ParsedItem["recipients"] = [];
            const seenDepts = new Set<string>();

            docRows.forEach((r) => {
              if (!r.dept_penerima) {
                errors.push(`Baris ${r._row}: Kode dept penerima kosong.`);
                return;
              }
              const dept = findDept(r.dept_penerima);
              if (!dept) {
                errors.push(
                  `Baris ${r._row}: Departemen penerima "${r.dept_penerima}" tidak ditemukan.`
                );
                return;
              }
              if (seenDepts.has(dept.id)) {
                warnings.push(
                  `Dokumen "${docNumber}" Rev.${revisi}: penerima "${r.dept_penerima}" duplikat di baris ${r._row}, qty dijumlah.`
                );
                const existing = recipients.find(
                  (rc) => rc.dept_id === dept.id
                );
                if (existing) existing.qty += r.qty;
              } else {
                seenDepts.add(dept.id);
                recipients.push({
                  dept_id: dept.id,
                  dept_code: dept.code,
                  qty: r.qty,
                });
              }
            });

            if (recipients.length === 0)
              errors.push(
                `Dokumen "${docNumber}" Rev.${revisi} tidak memiliki penerima yang valid.`
              );

            items.push({
              document_id: doc.id,
              doc_number: doc.doc_number,
              doc_title: doc.title,
              revision: doc.revision,
              distributed_date: overrideDate,
              recipients,
            });
          });

          if (items.length === 0 && errors.length === 0)
            errors.push(
              "Tidak ada dokumen yang valid ditemukan dalam form ini."
            );

          parsedForms.push({
            form_number: formNumber,
            distributed_date: firstRow.tanggal_distribusi,
            handed_by_dept_id: handedDept?.id ?? "",
            handed_by_dept_code: firstRow.diserahkan_oleh,
            notes: firstRow.catatan,
            items,
            errors,
            warnings,
          });
        });

        setForms(parsedForms);
        setExpandedForms(
          new Set(
            parsedForms
              .filter((f) => f.errors.length > 0)
              .map((f) => f.form_number)
          )
        );
        setStep("preview");
      } catch (err) {
        setParseError(
          `Gagal membaca file: ${
            err instanceof Error ? err.message : "Unknown error"
          }`
        );
      }
    };
    reader.readAsArrayBuffer(file);
  }

  // ── File handlers ───────────────────────────────────────────────────────────
  function handleFile(file: File | undefined) {
    if (!file) return;
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      setParseError("Hanya file .xlsx atau .xls yang diterima.");
      return;
    }
    setFileName(file.name);
    parseExcel(file);
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    handleFile(e.dataTransfer.files[0]);
  }, []);

  // ── Import ──────────────────────────────────────────────────────────────────
  async function handleImport() {
    const validForms = forms.filter((f) => f.errors.length === 0);
    setStep("importing");
    const results: { form_number: string; success: boolean; error?: string }[] =
      [];

    // Proses dalam batch 10 form sekaligus
    const BATCH_SIZE = 10;
    for (let i = 0; i < validForms.length; i += BATCH_SIZE) {
      const batch = validForms.slice(i, i + BATCH_SIZE);

      const batchResults = await Promise.all(
        batch.map(async (form) => {
          const items: DistributionItemInput[] = form.items.map((item) => ({
            document_id: item.document_id,
            distributed_date: item.distributed_date,
            recipients: item.recipients.map((r) => ({
              dept_id: r.dept_id,
              qty: r.qty,
            })),
          }));

          const result = await createDistribution(
            form.form_number,
            form.distributed_date,
            form.handed_by_dept_id,
            items,
            currentUserId,
            form.notes
          );

          return {
            form_number: form.form_number,
            success: !result?.error,
            error: result?.error,
          };
        })
      );

      results.push(...batchResults);
    }

    setImportResults(results);
    setStep("done");
  }

  function toggleExpand(key: string) {
    setExpandedForms((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const validCount = forms.filter((f) => f.errors.length === 0).length;
  const errorCount = forms.filter((f) => f.errors.length > 0).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={step === "importing" ? undefined : onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-slate-800">
              Import Form Distribusi
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {step === "upload" &&
                "Upload file Excel (.xlsx) berdasarkan template"}
              {step === "preview" &&
                `${forms.length} form ditemukan · ${validCount} siap import · ${errorCount} error`}
              {step === "importing" && "Sedang menyimpan data..."}
              {step === "done" && "Import selesai"}
            </p>
          </div>
          {step !== "importing" && (
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5">
          {/* ── STEP: UPLOAD ── */}
          {step === "upload" && (
            <div className="space-y-5">
              {/* Download template */}
              <button
                type="button"
                onClick={downloadTemplate}
                disabled={downloadingTemplate}
                className="flex items-center gap-3 p-4 border border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group w-full text-left disabled:opacity-60"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors shrink-0">
                  <DocumentArrowDownIcon
                    className={clsx(
                      "w-5 h-5 text-blue-600",
                      downloadingTemplate && "animate-pulse"
                    )}
                  />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    {downloadingTemplate
                      ? "Menyiapkan template..."
                      : "Download Template Excel"}
                  </p>
                  <p className="text-xs text-blue-500">
                    template_distribusi.xlsx · dengan dropdown departemen &
                    revisi
                  </p>
                </div>
              </button>

              {/* Drop zone */}
              {loadingDocs ? (
                <div className="flex flex-col items-center justify-center gap-3 h-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50">
                  <div className="w-8 h-8 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
                  <p className="text-xs text-slate-400">
                    Memuat daftar dokumen...
                  </p>
                </div>
              ) : (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={clsx(
                    "relative flex flex-col items-center justify-center gap-3 h-48 rounded-xl border-2 border-dashed cursor-pointer transition-all",
                    dragging
                      ? "border-blue-400 bg-blue-50"
                      : "border-slate-200 hover:border-blue-300 hover:bg-slate-50"
                  )}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={(e) => handleFile(e.target.files?.[0])}
                  />
                  <div
                    className={clsx(
                      "p-4 rounded-full transition-colors",
                      dragging ? "bg-blue-100" : "bg-slate-100"
                    )}
                  >
                    <ArrowUpTrayIcon
                      className={clsx(
                        "w-7 h-7",
                        dragging ? "text-blue-500" : "text-slate-400"
                      )}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">
                      {dragging
                        ? "Lepaskan file di sini"
                        : "Drag & drop file Excel"}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      atau klik untuk pilih file · .xlsx / .xls
                    </p>
                  </div>
                </div>
              )}

              {parseError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                  <ExclamationCircleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  {parseError}
                </div>
              )}

              {/* Format hint */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Kolom yang dibutuhkan
                </p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
                  {[
                    ["no_form", "Nomor form *"],
                    ["tanggal_distribusi", "Tanggal distribusi * (YYYY-MM-DD)"],
                    ["diserahkan_oleh", "Kode dept pengirim (DCC) *"],
                    ["nomor_dokumen", "Nomor dokumen *"],
                    ["revisi", "Revisi dokumen * (angka)"],
                    ["tanggal_dokumen", "Tanggal dokumen (opsional)"],
                    ["dept_penerima", "Kode dept penerima *"],
                    ["qty", "Qty *"],
                    ["catatan", "Catatan (opsional)"],
                  ].map(([field, label]) => (
                    <div key={field} className="flex items-center gap-2">
                      <span className="font-mono text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                        {field}
                      </span>
                      <span className="text-xs text-slate-500">{label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ── STEP: PREVIEW ── */}
          {step === "preview" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-slate-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-slate-800">
                    {forms.length}
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Total form</p>
                </div>
                <div className="bg-green-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {validCount}
                  </p>
                  <p className="text-xs text-green-500 mt-0.5">Siap import</p>
                </div>
                <div
                  className={clsx(
                    "rounded-xl p-3 text-center",
                    errorCount > 0 ? "bg-red-50" : "bg-slate-50"
                  )}
                >
                  <p
                    className={clsx(
                      "text-2xl font-bold",
                      errorCount > 0 ? "text-red-600" : "text-slate-300"
                    )}
                  >
                    {errorCount}
                  </p>
                  <p
                    className={clsx(
                      "text-xs mt-0.5",
                      errorCount > 0 ? "text-red-400" : "text-slate-300"
                    )}
                  >
                    Error
                  </p>
                </div>
              </div>

              {errorCount > 0 && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-700">
                  <ExclamationTriangleIcon className="w-4 h-4 mt-0.5 shrink-0" />
                  <span>
                    Form dengan error tidak akan diimport. Perbaiki file Excel,
                    lalu upload ulang.
                  </span>
                </div>
              )}

              <div className="space-y-2">
                {forms.map((form) => {
                  const hasError = form.errors.length > 0;
                  const hasWarning = form.warnings.length > 0;
                  const expanded = expandedForms.has(form.form_number);

                  return (
                    <div
                      key={form.form_number}
                      className={clsx(
                        "border rounded-xl overflow-hidden",
                        hasError
                          ? "border-red-200"
                          : hasWarning
                          ? "border-amber-200"
                          : "border-slate-200"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleExpand(form.form_number)}
                        className={clsx(
                          "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors",
                          hasError
                            ? "bg-red-50 hover:bg-red-100"
                            : hasWarning
                            ? "bg-amber-50 hover:bg-amber-100"
                            : "bg-slate-50 hover:bg-slate-100"
                        )}
                      >
                        {hasError ? (
                          <ExclamationCircleIcon className="w-4 h-4 text-red-500 shrink-0" />
                        ) : hasWarning ? (
                          <ExclamationTriangleIcon className="w-4 h-4 text-amber-500 shrink-0" />
                        ) : (
                          <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
                        )}

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono text-xs font-bold text-slate-700">
                              {form.form_number}
                            </span>
                            <span className="text-xs text-slate-400">
                              {formatDateDisplay(form.distributed_date)}
                            </span>
                            <span className="text-xs font-mono text-blue-600">
                              {form.handed_by_dept_code}
                            </span>
                            <span className="text-xs text-slate-400">
                              {form.items.length} dok ·{" "}
                              {form.items.reduce(
                                (s, i) => s + i.recipients.length,
                                0
                              )}{" "}
                              penerima
                            </span>
                          </div>
                          {form.notes && (
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {form.notes}
                            </p>
                          )}
                        </div>

                        {hasError && (
                          <span className="text-[10px] bg-red-100 text-red-600 font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {form.errors.length} error
                          </span>
                        )}
                        {!hasError && hasWarning && (
                          <span className="text-[10px] bg-amber-100 text-amber-600 font-semibold px-2 py-0.5 rounded-full shrink-0">
                            {form.warnings.length} peringatan
                          </span>
                        )}
                        {!hasError && !hasWarning && (
                          <span className="text-[10px] bg-green-100 text-green-700 font-semibold px-2 py-0.5 rounded-full shrink-0">
                            OK
                          </span>
                        )}

                        {expanded ? (
                          <ChevronDownIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-slate-400 shrink-0" />
                        )}
                      </button>

                      {expanded && (
                        <div className="px-4 py-3 space-y-3 bg-white border-t border-slate-100">
                          {form.errors.length > 0 && (
                            <div className="space-y-1">
                              {form.errors.map((e, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-red-600"
                                >
                                  <ExclamationCircleIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  {e}
                                </div>
                              ))}
                            </div>
                          )}

                          {form.warnings.length > 0 && (
                            <div className="space-y-1">
                              {form.warnings.map((w, i) => (
                                <div
                                  key={i}
                                  className="flex items-start gap-2 text-xs text-amber-600"
                                >
                                  <ExclamationTriangleIcon className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                                  {w}
                                </div>
                              ))}
                            </div>
                          )}

                          {form.items.length > 0 && (
                            <div className="space-y-2">
                              {form.items.map((item) => (
                                <div
                                  key={`${item.document_id}-${item.revision}`}
                                  className="bg-slate-50 rounded-lg px-3 py-2 space-y-1.5"
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono text-[11px] font-bold text-blue-700">
                                      {item.doc_number}
                                    </span>
                                    <span className="text-[10px] bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded font-mono font-semibold shrink-0">
                                      Rev.{item.revision}
                                    </span>
                                    <span className="text-[11px] text-slate-500 truncate">
                                      {item.doc_title}
                                    </span>
                                    {item.distributed_date && (
                                      <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium ml-auto shrink-0">
                                        {formatDateDisplay(
                                          item.distributed_date
                                        )}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-wrap gap-1 pl-1">
                                    {item.recipients.map((r) => (
                                      <span
                                        key={r.dept_id}
                                        className="text-[10px] bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full"
                                      >
                                        {r.dept_code} × {r.qty}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── STEP: IMPORTING ── */}
          {step === "importing" && (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <div className="w-12 h-12 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin" />
              <p className="text-sm text-slate-500">
                Menyimpan {validCount} form distribusi...
              </p>
            </div>
          )}

          {/* ── STEP: DONE ── */}
          {step === "done" && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {importResults.filter((r) => r.success).length}
                  </p>
                  <p className="text-xs text-green-500 mt-1">
                    Berhasil disimpan
                  </p>
                </div>
                <div
                  className={clsx(
                    "rounded-xl p-4 text-center",
                    importResults.some((r) => !r.success)
                      ? "bg-red-50"
                      : "bg-slate-50"
                  )}
                >
                  <p
                    className={clsx(
                      "text-2xl font-bold",
                      importResults.some((r) => !r.success)
                        ? "text-red-600"
                        : "text-slate-300"
                    )}
                  >
                    {importResults.filter((r) => !r.success).length}
                  </p>
                  <p
                    className={clsx(
                      "text-xs mt-1",
                      importResults.some((r) => !r.success)
                        ? "text-red-400"
                        : "text-slate-300"
                    )}
                  >
                    Gagal
                  </p>
                </div>
              </div>

              {importResults.map((r) => (
                <div
                  key={r.form_number}
                  className={clsx(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl border text-sm",
                    r.success
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  )}
                >
                  {r.success ? (
                    <CheckCircleIcon className="w-4 h-4 text-green-500 shrink-0" />
                  ) : (
                    <ExclamationCircleIcon className="w-4 h-4 text-red-500 shrink-0" />
                  )}
                  <span className="font-mono text-xs font-bold text-slate-700">
                    {r.form_number}
                  </span>
                  {r.error && (
                    <span className="text-xs text-red-500 ml-auto">
                      {r.error}
                    </span>
                  )}
                  {r.success && (
                    <span className="text-xs text-green-500 ml-auto">
                      Tersimpan
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex gap-2 justify-between px-6 py-4 border-t border-slate-100 shrink-0">
          {step === "preview" && (
            <button
              type="button"
              onClick={() => {
                setStep("upload");
                setForms([]);
                setFileName("");
                setParseError("");
              }}
              className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
            >
              ← Upload ulang
            </button>
          )}
          {step === "done" && <div />}
          {step === "upload" && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
          )}

          <div className="flex gap-2 ml-auto">
            {step === "done" && (
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all"
              >
                Selesai
              </button>
            )}
            {step === "preview" && validCount > 0 && (
              <button
                type="button"
                onClick={handleImport}
                className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all"
              >
                Import {validCount} Form →
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
