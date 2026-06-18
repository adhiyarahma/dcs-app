// app/api/documents/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import ExcelJS from "exceljs";

// ─── Mapping jenis dokumen → template key ─────────────────────────────────────
type TemplateKey =
  | "msds_benang"
  | "msds_kimia"
  | "qesh"
  | "ext_coa"
  | "ext_diu"
  | "ext_itp"
  | "ext_kal"
  | "ext_pip"
  | "ext_spk"
  | "ext_tes";

const TYPE_NAME_TO_TEMPLATE: Record<string, TemplateKey> = {
  "MSDS Benang": "msds_benang",
  "MSDS Kimia": "msds_kimia",
  "Instruksi Kerja": "qesh",
  Formulir: "qesh",
  Spesifikasi: "qesh",
  Prosedur: "qesh",
  Panduan: "qesh",
  "Job Description": "qesh",
  "Job Qualification": "qesh",
  Pedoman: "qesh",
  // ── Dokumen eksternal ──
  COA: "ext_coa",
  DIU: "ext_diu",
  ITP: "ext_itp",
  KAL: "ext_kal",
  PIP: "ext_pip",
  SPK: "ext_spk",
  TES: "ext_tes",
};

// Set untuk deteksi cepat apakah sebuah TemplateKey termasuk grup eksternal
const EXTERNAL_TEMPLATE_KEYS: TemplateKey[] = [
  "ext_coa",
  "ext_diu",
  "ext_itp",
  "ext_kal",
  "ext_pip",
  "ext_spk",
  "ext_tes",
];

// ─── Checklist MSDS (kiri | kanan) ───────────────────────────────────────────
// Catatan: checklist ini dipakai bersama untuk MSDS & Dokumen Eksternal,
// karena sisi kanan sudah mencakup SPK, KAL, TES, ITP, COA, DIU, PIP.
const MSDS_CHECKLIST: [string, string][] = [
  ["MSDS (LKB)", "Katalog Suku Cadang (KSC)"],
  ["Spesifikasi (SPK)", "Hasil Kalibrasi (KAL)"],
  [
    "Peraturan Pemerintah dan Perundangan (PPU)",
    "Hasil Pengetesan Eksternal (TES)",
  ],
  ["Informasi Teknik Produk (ITP)", "Certificate Of Analysis (COA)"],
  ["Dokumen Informasi Umum (DIU)", "……………………………….."],
  ["Petunjuk Instruksi Penggunaan (PIP)", ""],
];

// Mapping kode jenis eksternal → label persis yang dipakai di MSDS_CHECKLIST,
// supaya checklist bisa mencentang kotak yang benar sesuai docTypeName ("COA", "KAL", dst).
const EXTERNAL_CHECKLIST_LABEL: Record<string, string> = {
  COA: "Certificate Of Analysis (COA)",
  DIU: "Dokumen Informasi Umum (DIU)",
  ITP: "Informasi Teknik Produk (ITP)",
  KAL: "Hasil Kalibrasi (KAL)",
  PIP: "Petunjuk Instruksi Penggunaan (PIP)",
  SPK: "Spesifikasi (SPK)",
  TES: "Hasil Pengetesan Eksternal (TES)",
};

// ─── Checklist QESH (kiri | kanan) ───────────────────────────────────────────
const QESH_CHECKLIST: [string, string][] = [
  ["Pedoman QESH", "Formulir"],
  ["Prosedur QESH", "Uraian Pekerjaan"],
  ["Instruksi Kerja", "Kualifikasi Pegawai"],
  ["Spesifikasi", "………………………………."],
];

const QESH_DB_MAP: Record<string, string> = {
  "Pedoman QESH": "Pedoman",
  "Prosedur QESH": "Prosedur",
  "Instruksi Kerja": "Instruksi Kerja",
  Spesifikasi: "Spesifikasi",
  Formulir: "Formulir",
  "Uraian Pekerjaan": "Job Description",
  "Kualifikasi Pegawai": "Job Qualification",
};

// ─── Kolom tabel per template ─────────────────────────────────────────────────
// border hanya sampai kolom terakhir yang di-border
// kolom setelah itu tetap ada tapi tanpa border (konsisten dengan export)

interface ColDef {
  label: string;
  field: string;
  width: number;
  align: "center" | "left";
  withBorder: boolean; // apakah kolom ini masuk dalam border tabel
  required: boolean;
}

const COLUMNS: Record<TemplateKey, ColDef[]> = {
  // MSDS Benang: border A-D, kolom E-I tanpa border
  msds_benang: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 46,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 23,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Keterangan",
      field: "revision",
      width: 15,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Tgl Efektif",
      field: "effective_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Masa Berlaku",
      field: "expiry_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Link File (EN)",
      field: "link_en",
      width: 12,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Link File (ID)",
      field: "link_id",
      width: 12,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],
  // MSDS Kimia: border A-D, kolom E-K tanpa border
  msds_kimia: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 46,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 23,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Keterangan",
      field: "revision",
      width: 15,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Tgl Efektif",
      field: "effective_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Tgl Revisi",
      field: "revision_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Masa Berlaku",
      field: "expiry_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Link File (EN)",
      field: "link_en",
      width: 12,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Link File (ID)",
      field: "link_id",
      width: 12,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Production Type",
      field: "production_type",
      width: 15,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],
  // QESH: border A-E, kolom F-H tanpa border
  qesh: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 43,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 18,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Rev",
      field: "revision",
      width: 8,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Keterangan",
      field: "department_id",
      width: 18,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Tgl Efektif",
      field: "effective_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Link File",
      field: "link_file",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],

  // ── Dokumen Eksternal: COA ── border A-D (sampai Keterangan), sisanya tanpa border
  // Field: Judul Dokumen, No. Dokumen, Keterangan (wajib), Tanggal (wajib)
  // Catatan: kolom Status DIHAPUS dari template — semua dokumen COA otomatis "terbaru"
  ext_coa: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 43,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 20,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Keterangan",
      field: "source",
      width: 18,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Tanggal",
      field: "effective_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Link File",
      field: "link_file",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
  ],

  // ── Dokumen Eksternal: DIU ── border A-D (sampai Keterangan)
  // Field: Judul Dokumen, No. Dokumen, Keterangan (wajib), Status
  // Catatan: kolom Tanggal DIGANTI dengan Keterangan
  ext_diu: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 43,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 20,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Keterangan",
      field: "source",
      width: 18,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Link File",
      field: "link_file",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],

  // ── Dokumen Eksternal: ITP ── border A-D (sampai Keterangan)
  // Field: Judul Dokumen, No. Dokumen, Keterangan (wajib), Revisi (opsional), Tgl Efektif (opsional), Status
  ext_itp: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 40,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 20,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Keterangan",
      field: "source",
      width: 18,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Revisi",
      field: "revision",
      width: 8,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Tgl Efektif",
      field: "effective_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Link File",
      field: "link_file",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],

  // ── Dokumen Eksternal: KAL ── border A-D (sampai No. Order, unique key baru)
  // Field: Judul Dokumen, No. Dokumen (OPSIONAL), No. Order (wajib, unique key),
  //        Tgl Pengujian/Masa Berlaku (wajib, format fleksibel: DD/MM/YYYY, MM/YYYY, atau YYYY),
  //        Jenis, Merek, Model, No. Seri, Tgl Kalibrasi (format fleksibel, opsional), Status
  ext_kal: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 36,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 16,
      align: "center",
      withBorder: true,
      required: false,
    },
    {
      label: "No. Order",
      field: "no_order",
      width: 16,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Tgl Pengujian / Masa Berlaku",
      field: "expiry_date",
      width: 22,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Jenis",
      field: "item_type",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Merek",
      field: "brand",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Model",
      field: "model",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "No. Seri",
      field: "serial_no",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Tgl Kalibrasi",
      field: "calibration_date",
      width: 18,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Link File",
      field: "link_file",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],

  // ── Dokumen Eksternal: PIP ── border A-C (paling minim, tidak ada kolom wajib lain)
  // Field: Judul Dokumen, No. Dokumen, Status (paling minim)
  ext_pip: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 46,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 22,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Link File",
      field: "link_file",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],

  // ── Dokumen Eksternal: SPK ── border A-C (sama seperti PIP)
  // Field: Judul Dokumen, No. Dokumen, Status (sama seperti PIP)
  ext_spk: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 46,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 22,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Link File",
      field: "link_file",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],

  // ── Dokumen Eksternal: TES ── border A-D (sampai Keterangan)
  // Field: Judul Dokumen, No. Dokumen, Keterangan (wajib), Tanggal (wajib), Test Report No. (opsional), Status
  ext_tes: [
    {
      label: "No.",
      field: "no",
      width: 4,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Judul Dokumen",
      field: "title",
      width: 38,
      align: "left",
      withBorder: true,
      required: true,
    },
    {
      label: "No. Dokumen",
      field: "doc_number",
      width: 18,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Keterangan",
      field: "source",
      width: 16,
      align: "center",
      withBorder: true,
      required: true,
    },
    {
      label: "Tanggal",
      field: "effective_date",
      width: 14,
      align: "center",
      withBorder: false,
      required: true,
    },
    {
      label: "Test Report No.",
      field: "test_report_no",
      width: 16,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Link File",
      field: "link_file",
      width: 14,
      align: "center",
      withBorder: false,
      required: false,
    },
    {
      label: "Status",
      field: "status",
      width: 12,
      align: "center",
      withBorder: false,
      required: true,
    },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatTanggalLengkap(d: Date): string {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

const thinBorder: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "000000" } },
  bottom: { style: "thin", color: { argb: "000000" } },
  left: { style: "thin", color: { argb: "000000" } },
  right: { style: "thin", color: { argb: "000000" } },
};

function setHeaderCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string,
  size = 11,
  bold = false
) {
  const c = ws.getCell(row, col);
  c.value = value;
  c.font = { name: "Arial", size, bold };
  return c;
}

function applyOutsideBorder(
  ws: ExcelJS.Worksheet,
  startRow: number,
  startCol: number,
  endRow: number,
  endCol: number
) {
  const edge: ExcelJS.Border = { style: "thin", color: { argb: "000000" } };
  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const cell = ws.getCell(r, c);
      const border: Partial<ExcelJS.Borders> = { ...(cell.border ?? {}) };
      if (r === startRow) border.top = edge;
      if (r === endRow) border.bottom = edge;
      if (c === startCol) border.left = edge;
      if (c === endCol) border.right = edge;
      cell.border = border;
    }
  }
}

// ─── Header MSDS & Dokumen Eksternal (sama-sama pakai MSDS_CHECKLIST) ─────────
// `checkedLabel` adalah label tepat yang harus dicentang (dipakai untuk eksternal,
// karena docTypeName-nya berupa kode singkat seperti "COA", "KAL", bukan label lengkap).
function buildMsdsHeader(
  ws: ExcelJS.Worksheet,
  categoryName: string,
  typeName: string,
  checkedLabel?: string
) {
  ws.mergeCells(1, 1, 1, 4);
  setHeaderCell(ws, 1, 1, "PT. IDAMAN ERAMANDIRI", 12).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  ws.mergeCells(2, 1, 2, 4);
  setHeaderCell(ws, 2, 1, "Daftar Induk Dokumen", 16, true).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  ws.getRow(2).height = 20.25;
  setHeaderCell(ws, 4, 1, "Kategori Dokumen:", 11);

  // Label yang harus dicentang: untuk eksternal pakai checkedLabel (label lengkap dari
  // EXTERNAL_CHECKLIST_LABEL), untuk MSDS biasa pakai typeName langsung.
  const targetLabel = checkedLabel ?? typeName;

  const isMsds = categoryName.toLowerCase().includes("msds");
  // Ambil semua tipe yang sudah ada di checklist
  const knownMsdsTypes = MSDS_CHECKLIST.flat().filter(
    (item) => item && !item.includes("…")
  );
  const isOtherType = !isMsds && !knownMsdsTypes.includes(targetLabel);

  MSDS_CHECKLIST.forEach(([left, right], i) => {
    const rowNum = 5 + i;
    ws.getRow(rowNum).height = 15.75;

    // Cek sisi kiri
    const isCheckedLeft =
      (left === "MSDS (LKB)" && isMsds) || left === targetLabel;
    setHeaderCell(
      ws,
      rowNum,
      1,
      `${isCheckedLeft ? "■" : "□"} ${left}`,
      11,
      true
    ).alignment = { vertical: "middle" };

    // Cek sisi kanan
    if (right) {
      const isOther = right.includes("…") && isOtherType;
      const displayText = isOther ? targetLabel : right;
      const isCheckedRight = isOther ? true : right === targetLabel;
      setHeaderCell(
        ws,
        rowNum,
        3,
        `${isCheckedRight ? "■" : "□"} ${displayText}`,
        11,
        true
      ).alignment = { vertical: "middle" };
    }
  });

  ws.mergeCells(12, 1, 12, 4);
  setHeaderCell(
    ws,
    12,
    1,
    `Hari dan Tanggal : ${formatTanggalLengkap(new Date())}`,
    11
  ).alignment = { vertical: "middle" };
  applyOutsideBorder(ws, 1, 1, 13, 4);
}

// ─── Header QESH (Perbaikan: Tambahkan pengecekan dinamis) ────────────────────
function buildQeshHeader(ws: ExcelJS.Worksheet, typeName: string) {
  ws.mergeCells(1, 1, 1, 5);
  setHeaderCell(ws, 1, 1, "PT. IDAMAN ERAMANDIRI", 12).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  ws.mergeCells(2, 1, 2, 5);
  setHeaderCell(ws, 2, 1, "Daftar Induk Dokumen QESH", 16, true).alignment = {
    horizontal: "center",
    vertical: "middle",
  };
  ws.getRow(2).height = 20.25;
  setHeaderCell(ws, 4, 1, "Kategori Dokumen:", 11);

  const knownQeshTypes = Object.values(QESH_DB_MAP);
  const isOtherType = !knownQeshTypes.includes(typeName);

  QESH_CHECKLIST.forEach(([left, right], i) => {
    const rowNum = 5 + i;
    const isCheckedLeft = (QESH_DB_MAP[left] ?? left) === typeName;
    setHeaderCell(
      ws,
      rowNum,
      1,
      `${isCheckedLeft ? "■" : "□"} ${left}`,
      11,
      true
    ).alignment = { vertical: "middle" };

    if (right) {
      const isOther = right.includes("…") && isOtherType;
      const displayText = isOther ? typeName : right;
      const isCheckedRight = isOther
        ? true
        : (QESH_DB_MAP[right] ?? right) === typeName;
      setHeaderCell(
        ws,
        rowNum,
        3,
        `${isCheckedRight ? "■" : "□"} ${displayText}`,
        11,
        true
      ).alignment = { vertical: "middle" };
    }
  });
  ws.mergeCells(10, 1, 10, 5);
  setHeaderCell(
    ws,
    10,
    1,
    `Hari dan Tanggal : ${formatTanggalLengkap(new Date())}`,
    11
  ).alignment = { vertical: "middle" };
  applyOutsideBorder(ws, 1, 1, 11, 5);
}

// ─── Tabel header + area data ─────────────────────────────────────────────────
function buildTable(
  ws: ExcelJS.Worksheet,
  cols: ColDef[],
  headerRow: number, // baris pertama header tabel
  deptList: string[]
) {
  // Set lebar kolom
  cols.forEach((col, i) => {
    ws.getColumn(i + 1).width = col.width;
  });

  // ── Header tabel ──
  cols.forEach((col, i) => {
    const colNum = i + 1;
    const c = ws.getCell(headerRow, colNum);
    c.value = col.label;
    c.font = { name: "Arial", size: 10 };
    c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    if (col.withBorder) c.border = thinBorder;

    // Kolom dengan format tanggal fleksibel (boleh DD/MM/YYYY, MM/YYYY, atau YYYY saja)
    // diberi komentar Excel supaya user tahu format yang diterima.
    if (col.field === "expiry_date" || col.field === "calibration_date") {
      c.note = {
        texts: [
          {
            text: "Format yang diterima:\nDD/MM/YYYY (contoh: 18/06/2026)\nMM/YYYY (contoh: 06/2026)\nYYYY (contoh: 2026)",
          },
        ],
      } as any;
    }
  });
  ws.getRow(headerRow).height = 20;

  // ── Sub-header (wajib / opsional) ──
  const subRow = headerRow + 1;
  cols.forEach((col, i) => {
    const colNum = i + 1;
    const c = ws.getCell(subRow, colNum);
    c.value = col.required ? "(wajib diisi)" : "(opsional)";
    c.font = {
      name: "Arial",
      size: 9,
      italic: true,
      color: { argb: col.required ? "375623" : "7F6000" },
    };
    c.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: col.required ? "C6EFCE" : "FFEB9C" },
    };
    c.alignment = { horizontal: "center", vertical: "middle" };
    if (col.withBorder) c.border = thinBorder;
  });
  ws.getRow(subRow).height = 16;

  // ── Area data baris dataStart s/d dataStart+99 ──
  const dataStart = subRow + 1;
  for (let row = dataStart; row < dataStart + 100; row++) {
    cols.forEach((col, i) => {
      const colNum = i + 1;
      const cell = ws.getCell(row, colNum);
      cell.font = { name: "Arial", size: 10 };
      cell.alignment = { horizontal: col.align, vertical: "middle" };
      if (col.withBorder) cell.border = thinBorder;

      // Nomor otomatis
      if (col.field === "no") cell.value = row - dataStart + 1;
    });
    ws.getRow(row).height = 16;
  }

  // ── Dropdown Status ──
  const statusIdx = cols.findIndex((c) => c.field === "status");
  if (statusIdx >= 0) {
    for (let row = dataStart; row < dataStart + 100; row++) {
      ws.getCell(row, statusIdx + 1).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Terbaru,Kadaluarsa,Dihapus"'],
        showErrorMessage: true,
        errorTitle: "Nilai tidak valid",
        error: "Pilih salah satu: Terbaru, Kadaluarsa, atau Dihapus",
      };
    }
  }

  // ── Dropdown Departemen (kolom Keterangan pada QESH) ──
  const deptIdx = cols.findIndex((c) => c.field === "department_id");
  if (deptIdx >= 0 && deptList.length > 0) {
    const refWs = ws.workbook.addWorksheet("_ref_departments");
    (refWs as any).state = "hidden";
    deptList.forEach((dept, i) => {
      refWs.getCell(i + 1, 1).value = dept;
    });

    for (let row = dataStart; row < dataStart + 100; row++) {
      ws.getCell(row, deptIdx + 1).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: [`_ref_departments!$A$1:$A$${deptList.length}`],
        showErrorMessage: true,
        errorTitle: "Departemen tidak valid",
        error: "Pilih departemen dari daftar yang tersedia",
      };
    }
  }

  // ── Dropdown Production Type (MSDS Kimia) ──
  const prodIdx = cols.findIndex((c) => c.field === "production_type");
  if (prodIdx >= 0) {
    for (let row = dataStart; row < dataStart + 100; row++) {
      ws.getCell(row, prodIdx + 1).dataValidation = {
        type: "list",
        allowBlank: true,
        formulae: ['"Production,Non-Production,Prod. Bahan Baku"'],
        showErrorMessage: true,
        errorTitle: "Nilai tidak valid",
        error:
          "Pilih salah satu: Production, Non-Production, atau Prod. Bahan Baku",
      };
    }
  }

  return dataStart + 100; // baris setelah area data
}

// ─── Main GET ─────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const docTypeName = searchParams.get("type") ?? "";
  const categoryName = searchParams.get("category") ?? "";

  if (!docTypeName) {
    return NextResponse.json(
      { error: "Parameter type wajib diisi" },
      { status: 400 }
    );
  }

  // Ambil daftar departemen
  const { data: departments } = await supabaseAdmin
    .from("departments")
    .select("code, name")
    .order("code");
  const deptList = (departments ?? []).map(
    (d: { code: string; name: string }) => `${d.code} - ${d.name}`
  );

  const template = TYPE_NAME_TO_TEMPLATE[docTypeName] ?? "qesh";
  const cols = COLUMNS[template];
  const isExternal = EXTERNAL_TEMPLATE_KEYS.includes(template);

  // Kolom terakhir yang di-border
  const lastBorderColIdx = cols.reduce(
    (last, col, i) => (col.withBorder ? i + 1 : last),
    1
  );

  const wb = new ExcelJS.Workbook();
  wb.creator = "DCS System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Import Dokumen", {
    pageSetup: { orientation: "landscape" },
  });

  // ── Bangun header & tabel sesuai template ──
  let tableHeaderRow: number;
  let footerRef: string;
  let freezeRow: number;

  if (template === "msds_benang" || template === "msds_kimia") {
    buildMsdsHeader(ws, categoryName, docTypeName);
    tableHeaderRow = 14; // header tabel mulai baris 14 (setelah header 1-13)
    footerRef = "FL-MRP-018, REV 01";
    freezeRow = 16; // freeze setelah 2 baris header tabel
  } else if (isExternal) {
    // Dokumen eksternal: pakai header gaya MSDS (checklist ■/□), tapi
    // docTypeName-nya berupa kode singkat (COA, KAL, dst), jadi perlu
    // map ke label lengkap supaya kotak yang tepat tercentang.
    const checkedLabel = EXTERNAL_CHECKLIST_LABEL[docTypeName] ?? docTypeName;
    buildMsdsHeader(ws, categoryName, docTypeName, checkedLabel);
    tableHeaderRow = 14; // sama seperti layout MSDS
    footerRef = "FL-MRP-018, REV 01"; // sesuaikan jika dokumen eksternal punya nomor form sendiri
    freezeRow = 16;
  } else {
    buildQeshHeader(ws, docTypeName);
    tableHeaderRow = 12; // header tabel mulai baris 12 (setelah header 1-11)
    footerRef = "FL-MRP-003, REV 03";
    freezeRow = 14; // freeze setelah 2 baris header tabel
  }

  const lastDataRow = buildTable(ws, cols, tableHeaderRow, deptList);

  // ── Footer referensi form di kolom terakhir yang di-border ──
  const footerRow = lastDataRow + 1;
  const fc = ws.getCell(footerRow, lastBorderColIdx);
  fc.value = footerRef;
  fc.font = { name: "Arial", size: 11 };
  fc.alignment = { horizontal: "center" };

  // ── Freeze header ──
  ws.views = [{ state: "frozen", ySplit: freezeRow - 1 }];

  // ── Kirim file ──
  const buffer = await wb.xlsx.writeBuffer();
  const filename = `template_${docTypeName.replace(/\s+/g, "_")}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
