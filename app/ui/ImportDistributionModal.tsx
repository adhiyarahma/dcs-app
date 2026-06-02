"use client";

/**
 * ImportDistributionModal
 *
 * Alur:
 * 1. User upload file .xlsx
 * 2. Parse di client pakai SheetJS (xlsx)
 * 3. Validasi & kelompokkan per nomor form → preview tabel
 * 4. Konfirmasi → kirim ke server action createDistribution per form
 *
 * Kolom Excel yang diharapkan (lihat template_distribusi.xlsx):
 *   A  no_form              – string, wajib
 *   B  tanggal_distribusi   – date string YYYY-MM-DD, wajib
 *   C  diserahkan_oleh      – kode dept (DCC), wajib
 *   D  nomor_dokumen        – doc_number, wajib
 *   E  revisi               – angka revisi dokumen, wajib (untuk membedakan dok sama beda revisi)
 *   F  tanggal_dokumen      – date string YYYY-MM-DD, opsional (override per dok)
 *   G  dept_penerima        – kode dept penerima, wajib
 *   H  qty                  – angka ≥ 1, wajib
 *   I  catatan              – string, opsional (dipakai nilai dari baris pertama tiap form)
 */

import { useRef, useState, useCallback } from "react";
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
type Dept = { id: string; code: string; name: string };
type DocOption = {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
};

/** Satu baris mentah dari Excel */
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
  /** nomor baris di sheet (untuk pesan error) */
  _row: number;
}

/** Satu form hasil grouping */
interface ParsedForm {
  form_number: string;
  distributed_date: string;
  handed_by_dept_id: string;
  handed_by_dept_code: string;
  notes: string;
  items: ParsedItem[];
  /** error-level (block import) */
  errors: string[];
  /** warning-level (tidak block, hanya info) */
  warnings: string[];
}

interface ParsedItem {
  document_id: string;
  doc_number: string;
  doc_title: string;
  revision: number;
  distributed_date: string | null; // null = pakai tanggal form
  recipients: { dept_id: string; dept_code: string; qty: number }[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normalizeDate(raw: unknown): string {
  if (!raw) return "";
  // SheetJS bisa return Date object atau number (serial) atau string
  if (raw instanceof Date) {
    return raw.toISOString().split("T")[0];
  }
  if (typeof raw === "number") {
    // Excel date serial
    const d = XLSX.SSF.parse_date_code(raw);
    if (!d) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.y}-${pad(d.m)}-${pad(d.d)}`;
  }
  const s = String(raw).trim();
  // DD/MM/YYYY → YYYY-MM-DD
  const dmy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy)
    return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;
  // already YYYY-MM-DD
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [fileName, setFileName] = useState("");

  // step: "upload" | "preview" | "importing" | "done"
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">(
    "upload"
  );
  const [parseError, setParseError] = useState("");
  const [forms, setForms] = useState<ParsedForm[]>([]);
  const [expandedForms, setExpandedForms] = useState<Set<string>>(new Set());
  const [importResults, setImportResults] = useState<
    { form_number: string; success: boolean; error?: string }[]
  >([]);

  // ── Lookup helpers ──────────────────────────────────────────────────────────
  function findDept(code: string): Dept | undefined {
    return departments.find(
      (d) => d.code.toLowerCase() === code.trim().toLowerCase()
    );
  }
  function findDoc(docNumber: string, revision: number): DocOption | undefined {
    // Cari dokumen yang cocok nomor + revisi; fallback ke nomor saja jika revisi 0/tidak diisi
    const byBoth = docOptions.find(
      (d) =>
        d.doc_number.toLowerCase() === docNumber.trim().toLowerCase() &&
        d.revision === revision
    );
    if (byBoth) return byBoth;
    // Jika revisi tidak diisi (0), ambil revisi tertinggi dengan nomor yang sama
    if (!revision) {
      const candidates = docOptions
        .filter(
          (d) => d.doc_number.toLowerCase() === docNumber.trim().toLowerCase()
        )
        .sort((a, b) => b.revision - a.revision);
      return candidates[0];
    }
    return undefined;
  }

  // ── Download template (generate di browser, tanpa file di server) ───────────
  function downloadTemplate() {
    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Form Distribusi ────────────────────────────────────────────
    const wsData: (string | number)[][] = [
      // Baris 1: judul banner
      ["TEMPLATE IMPORT DISTRIBUSI DOKUMEN", "", "", "", "", "", "", ""],
      // Baris 2: catatan
      [
        "Isi satu baris per DOKUMEN PER PENERIMA. Satu form bisa punya banyak dokumen & penerima.",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
      ],
      // Baris 3: header kolom
      [
        "Nomor Form *",
        "Tanggal Distribusi *",
        "Diserahkan Oleh (Kode Dept) *",
        "Nomor Dokumen *",
        "Revisi *",
        "Tanggal Dokumen (opsional)",
        "Kode Dept Penerima *",
        "Qty *",
        "Catatan (opsional)",
      ],
      // Baris 4: nama field
      [
        "[no_form]",
        "[tanggal_distribusi]",
        "[diserahkan_oleh]",
        "[nomor_dokumen]",
        "[revisi]",
        "[tanggal_dokumen]",
        "[dept_penerima]",
        "[qty]",
        "[catatan]",
      ],
      // Baris 5-9: contoh data
      [
        "001/DCC/06/26",
        "2026-06-01",
        "DCC",
        "DOC-001",
        1,
        "",
        "QC",
        2,
        "Distribusi awal",
      ],
      ["001/DCC/06/26", "2026-06-01", "DCC", "DOC-001", 1, "", "PROD", 1, ""],
      [
        "001/DCC/06/26",
        "2026-06-01",
        "DCC",
        "DOC-001",
        2,
        "2026-05-28",
        "HR",
        1,
        "Rev berbeda, tanggal berbeda",
      ],
      ["001/DCC/06/26", "2026-06-01", "DCC", "DOC-002", 1, "", "ENG", 1, ""],
      ["002/DCC/06/26", "2026-06-10", "DCC", "DOC-003", 3, "", "MAINT", 1, ""],
    ];

    // 20 baris kosong untuk diisi
    for (let i = 0; i < 20; i++)
      wsData.push(["", "", "", "", 1, "", "", 1, ""]);

    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Lebar kolom
    ws["!cols"] = [
      { wch: 20 }, // A no_form
      { wch: 22 }, // B tanggal_distribusi
      { wch: 26 }, // C diserahkan_oleh
      { wch: 22 }, // D nomor_dokumen
      { wch: 8 }, // E revisi
      { wch: 26 }, // F tanggal_dokumen
      { wch: 22 }, // G dept_penerima
      { wch: 8 }, // H qty
      { wch: 30 }, // I catatan
    ];

    // Merge baris 1 & 2
    ws["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 8 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 8 } },
    ];

    XLSX.utils.book_append_sheet(wb, ws, "Form Distribusi");

    // ── Sheet 2: Petunjuk ───────────────────────────────────────────────────
    const petunjukData: string[][] = [
      ["KOLOM", "KETERANGAN"],
      [
        "Nomor Form *",
        "Nomor form distribusi. Baris dengan nomor form yang sama akan digabung menjadi SATU form. Contoh: 001/DCC/06/26",
      ],
      [
        "Tanggal Distribusi *",
        "Tanggal distribusi utama form. Format: YYYY-MM-DD (contoh: 2026-06-01) atau DD/MM/YYYY.",
      ],
      [
        "Diserahkan Oleh *",
        "Kode departemen pengirim, harus DCC. Contoh: DCC.",
      ],
      [
        "Nomor Dokumen *",
        "Nomor dokumen yang didistribusikan. Harus ada di database. Contoh: DOC-001.",
      ],
      [
        "Revisi *",
        "Nomor revisi dokumen (angka). Penting jika ada dokumen dengan nomor sama tapi beda revisi. Jika kosong/0, sistem mengambil revisi tertinggi yang tersedia.",
      ],
      [
        "Tanggal Dokumen",
        "OPSIONAL. Isi jika tanggal distribusi dokumen ini berbeda dari tanggal form. Kosongkan jika sama.",
      ],
      [
        "Kode Dept Penerima *",
        "Kode departemen penerima. Harus ada di database. Contoh: QC, PROD, HR, ENG.",
      ],
      ["Qty *", "Jumlah dokumen yang diterima. Minimal 1."],
      [
        "Catatan",
        "OPSIONAL. Catatan tambahan untuk form (diambil dari baris pertama tiap nomor form).",
      ],
      ["", ""],
      ["— ATURAN PENTING —", ""],
      [
        "Satu baris = satu penerima",
        "Jika DOC-001 diterima QC dan PROD → buat 2 baris dengan nomor form yang sama.",
      ],
      [
        "Satu form bisa banyak dokumen",
        "Baris dengan nomor form yang sama dikelompokkan jadi satu form distribusi.",
      ],
      [
        "Kolom * wajib diisi",
        "Baris yang tidak lengkap akan ditolak saat preview import.",
      ],
      [
        "Format tanggal",
        "Gunakan YYYY-MM-DD untuk menghindari ambiguitas. Contoh: 2026-06-01.",
      ],
    ];

    const wsPetunjuk = XLSX.utils.aoa_to_sheet(petunjukData);
    wsPetunjuk["!cols"] = [{ wch: 28 }, { wch: 70 }];
    XLSX.utils.book_append_sheet(wb, wsPetunjuk, "Petunjuk");

    // Trigger download
    XLSX.writeFile(wb, "template_distribusi.xlsx");
  }

  // ── Parse Excel ─────────────────────────────────────────────────────────────
  function parseExcel(file: File) {
    setParseError("");
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: "array", cellDates: true });

        // Cari sheet pertama yang bukan "Petunjuk"
        const sheetName =
          wb.SheetNames.find((n) => !n.toLowerCase().includes("petunjuk")) ??
          wb.SheetNames[0];
        const ws = wb.Sheets[sheetName];

        // Baca dari baris ke-5 (index 4) — baris 1-4 adalah header
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
          range: 4, // skip 4 baris pertama (0-indexed)
          defval: "",
        });

        // Filter baris kosong
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
            _row: i + 5, // nomor baris Excel (1-based, header di 3-4)
          }))
          .filter((r) => r.no_form || r.nomor_dokumen || r.dept_penerima);

        if (rows.length === 0) {
          setParseError(
            "Tidak ada data yang ditemukan. Pastikan file menggunakan template yang benar dan ada data mulai baris ke-5."
          );
          return;
        }

        // ── Group by no_form ──────────────────────────────────────────────────
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

          // Validasi form-level
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

          // Group rows by nomor_dokumen + revisi (composite key)
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

          docMap.forEach((docRows, _key) => {
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

            // tanggal override — ambil dari baris pertama doc ini
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
                `Dokumen "${docNumber}" Rev.${revisi} memiliki tanggal override tidak konsisten antar baris; digunakan nilai baris pertama.`
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
        // Auto-expand forms yang punya error
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
    const results: typeof importResults = [];

    for (const form of validForms) {
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

      results.push({
        form_number: form.form_number,
        success: !result?.error,
        error: result?.error,
      });
    }

    setImportResults(results);
    setStep("done");
  }

  // ── Toggle expand ───────────────────────────────────────────────────────────
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
                className="flex items-center gap-3 p-4 border border-dashed border-blue-300 rounded-xl bg-blue-50 hover:bg-blue-100 transition-colors group w-full text-left"
              >
                <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors shrink-0">
                  <DocumentArrowDownIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-blue-700">
                    Download Template Excel
                  </p>
                  <p className="text-xs text-blue-500">
                    template_distribusi.xlsx · berisi contoh data & petunjuk
                  </p>
                </div>
              </button>

              {/* Drop zone */}
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
              {/* Summary bar */}
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

              {/* Form cards */}
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
                      {/* Card header */}
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
                        {/* status icon */}
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

                      {/* Expanded detail */}
                      {expanded && (
                        <div className="px-4 py-3 space-y-3 bg-white border-t border-slate-100">
                          {/* Errors */}
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

                          {/* Warnings */}
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

                          {/* Items preview */}
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
          {(step === "upload" || step === "preview") && step !== "preview" && (
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
