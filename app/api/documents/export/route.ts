// app/api/documents/export/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import ExcelJS from "exceljs";

// ─── Tipe Template ────────────────────────────────────────────────────────────
type TemplateType = "msds_benang" | "msds_kimia" | "qesh" | "default";

// ─── Mapping jenis dokumen → template ────────────────────────────────────────
const TYPE_NAME_TO_TEMPLATE: Record<string, TemplateType> = {
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
};

// ─── Checklist MSDS (kiri | kanan) ───────────────────────────────────────────
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

// ─── Checklist QESH (kiri | kanan) ───────────────────────────────────────────
const QESH_CHECKLIST: [string, string][] = [
  ["Pedoman QESH", "Formulir"],
  ["Prosedur QESH", "Uraian Pekerjaan"],
  ["Instruksi Kerja", "Kualifikasi Pegawai"],
  ["Spesifikasi", "………………………………."],
];

// Nama checklist QESH → nama jenis dokumen di DB
const QESH_DB_MAP: Record<string, string> = {
  "Pedoman QESH": "Pedoman",
  "Prosedur QESH": "Prosedur",
  "Instruksi Kerja": "Instruksi Kerja",
  Spesifikasi: "Spesifikasi",
  Formulir: "Formulir",
  "Uraian Pekerjaan": "Job Description",
  "Kualifikasi Pegawai": "Job Qualification",
};

const PRODUCTION_TYPE_LABEL: Record<string, string> = {
  production: "Production",
  "non-production": "Non-Production",
  "production bahan baku": "Prod. Bahan Baku",
};

const STATUS_LABEL: Record<string, string> = {
  terbaru: "Terbaru",
  kadaluarsa: "Kadaluarsa",
  dihapus: "Dihapus",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatDate(val: string | null | undefined): string {
  if (!val) return "";
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

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

// ─── Helper: apply outside border pada range sel ──────────────────────────────
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

/// ─── Header MSDS (rows 1-13) ──────────────────────────────────────────────────
function buildMsdsHeader(
  ws: ExcelJS.Worksheet,
  categoryName: string,
  typeName: string
) {
  // Row 1: PT. IDAMAN ERAMANDIRI — merge A1:D1
  ws.mergeCells(1, 1, 1, 4);
  const r1 = setHeaderCell(ws, 1, 1, "PT. IDAMAN ERAMANDIRI", 12);
  r1.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2: Daftar Induk Dokumen — merge A2:D2
  ws.mergeCells(2, 1, 2, 4);
  const r2 = setHeaderCell(ws, 2, 1, "Daftar Induk Dokumen", 16, true);
  r2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20.25;

  ws.getRow(3).height = 15.75;

  setHeaderCell(ws, 4, 1, "Kategori Dokumen:", 11);
  ws.getRow(4).height = 15.75;

  // Cek apakah jenis dokumen saat ini tidak ada di list default MSDS
  const isMsdsLkb = typeName.toLowerCase().includes("msds");
  const knownMsdsTypes = MSDS_CHECKLIST.flat().filter(
    (item) => item && !item.includes("…")
  );
  const isOtherType = !isMsdsLkb && !knownMsdsTypes.includes(typeName);

  MSDS_CHECKLIST.forEach(([left, right], i) => {
    const rowNum = 5 + i;
    ws.getRow(rowNum).height = 15.75;

    // Cek sisi kiri
    let isCheckedLeft = false;
    if (left === "MSDS (LKB)" && isMsdsLkb) {
      isCheckedLeft = true;
    } else if (left === typeName) {
      isCheckedLeft = true;
    }

    const lCell = setHeaderCell(
      ws,
      rowNum,
      1,
      `${isCheckedLeft ? "■" : "□"} ${left}`,
      11,
      true
    );
    lCell.alignment = { vertical: "middle" };

    // Cek sisi kanan
    if (right) {
      let displayText = right;
      let isCheckedRight = false;

      // Jika ini baris titik-titik (.......) dan tipe dokumen tidak ada di daftar
      if (right.includes("…")) {
        if (isOtherType) {
          displayText = typeName; // Ganti titik-titik dengan nama dokumennya
          isCheckedRight = true;
        }
      } else {
        isCheckedRight = right === typeName;
      }

      const rCell = setHeaderCell(
        ws,
        rowNum,
        3,
        `${isCheckedRight ? "■" : "□"} ${displayText}`,
        11,
        true
      );
      rCell.alignment = { vertical: "middle" };
    }
  });

  ws.getRow(11).height = 15.75;

  // Row 12: Hari dan Tanggal — merge A12:D12
  ws.mergeCells(12, 1, 12, 4);
  const dateCell = setHeaderCell(
    ws,
    12,
    1,
    `Hari dan Tanggal : ${formatTanggalLengkap(new Date())}`,
    11
  );
  dateCell.alignment = { vertical: "middle" };
  ws.getRow(12).height = 15.75;
  ws.getRow(13).height = 15.75;

  // Outside border: A1:D13 (col 1-4, row 1-13)
  applyOutsideBorder(ws, 1, 1, 13, 4);
}

// ─── Header QESH (rows 1-11) ──────────────────────────────────────────────────
function buildQeshHeader(ws: ExcelJS.Worksheet, typeName: string) {
  // Row 1: PT. IDAMAN ERAMANDIRI — merge A1:E1
  ws.mergeCells(1, 1, 1, 5);
  const r1 = setHeaderCell(ws, 1, 1, "PT. IDAMAN ERAMANDIRI", 12);
  r1.alignment = { horizontal: "center", vertical: "middle" };

  // Row 2: Daftar Induk Dokumen QESH — merge A2:E2
  ws.mergeCells(2, 1, 2, 5);
  const r2 = setHeaderCell(ws, 2, 1, "Daftar Induk Dokumen QESH", 16, true);
  r2.alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(2).height = 20.25;

  ws.getRow(3).height = 15.75;

  setHeaderCell(ws, 4, 1, "Kategori Dokumen:", 11);
  ws.getRow(4).height = 15.75;

  // Cek apakah jenis dokumen saat ini tidak ada di list default QESH
  const knownQeshTypes = Object.values(QESH_DB_MAP);
  const isOtherType = !knownQeshTypes.includes(typeName);

  QESH_CHECKLIST.forEach(([left, right], i) => {
    const rowNum = 5 + i;
    ws.getRow(rowNum).height = 15.75;

    // Cek sisi kiri
    const isCheckedLeft = (QESH_DB_MAP[left] ?? left) === typeName;
    const lCell = setHeaderCell(
      ws,
      rowNum,
      1,
      `${isCheckedLeft ? "■" : "□"} ${left}`,
      11,
      true
    );
    lCell.alignment = { vertical: "middle" };

    // Cek sisi kanan
    if (right) {
      let displayText = right;
      let isCheckedRight = false;

      // Jika ini baris titik-titik (.......) dan tipe dokumen tidak ada di daftar
      if (right.includes("…")) {
        if (isOtherType) {
          displayText = typeName; // Ganti titik-titik dengan nama dokumennya (misal: "Panduan")
          isCheckedRight = true;
        }
      } else {
        isCheckedRight = (QESH_DB_MAP[right] ?? right) === typeName;
      }

      const rCell = setHeaderCell(
        ws,
        rowNum,
        3,
        `${isCheckedRight ? "■" : "□"} ${displayText}`,
        11,
        true
      );
      rCell.alignment = { vertical: "middle" };
    }
  });

  ws.getRow(9).height = 15.75;

  // Row 10: Hari dan Tanggal — merge A10:E10
  ws.mergeCells(10, 1, 10, 5);
  const dateCell = setHeaderCell(
    ws,
    10,
    1,
    `Hari dan Tanggal : ${formatTanggalLengkap(new Date())}`,
    11
  );
  dateCell.alignment = { vertical: "middle" };
  ws.getRow(10).height = 15.75;
  ws.getRow(11).height = 12.75;

  // Outside border: A1:E11 (col 1-5, row 1-11)
  applyOutsideBorder(ws, 1, 1, 11, 5);
}

// ─── Helper: set tabel header cell dengan border ──────────────────────────────
function setTableHeader(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string
) {
  const c = ws.getCell(row, col);
  c.value = value;
  c.font = { name: "Arial", size: 10 };
  c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  c.border = thinBorder;
  return c;
}

// ─── Helper: set tabel header cell tanpa border ───────────────────────────────
function setTableHeaderNoBorder(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: string
) {
  const c = ws.getCell(row, col);
  c.value = value;
  c.font = { name: "Arial", size: 10 };
  c.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
  return c;
}

// ─── Helper: set data cell dengan border ─────────────────────────────────────
function setDataCell(
  ws: ExcelJS.Worksheet,
  row: number,
  col: number,
  value: ExcelJS.CellValue,
  align: "center" | "left" = "left",
  withBorder = true
) {
  const c = ws.getCell(row, col);
  c.value = value;
  c.font = { name: "Arial", size: 10 };
  c.alignment = { horizontal: align, vertical: "middle" };
  if (withBorder) c.border = thinBorder;
  return c;
}

// ─── Tabel MSDS Benang (row 14+) ─────────────────────────────────────────────
// Border hanya kolom A-D (1-4): No | Judul | No. Dok | Keterangan(Rev)
// Kolom E-I (5-9) tetap ada data tapi tanpa border
function buildMsdsBenangTable(ws: ExcelJS.Worksheet, docs: any[]) {
  const HR = 14;
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 46;
  ws.getColumn(3).width = 23;
  ws.getColumn(4).width = 15;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 12;
  ws.getColumn(8).width = 12;
  ws.getColumn(9).width = 12;

  // Header row 1: kolom 1-4 dengan border, kolom 5-9 tanpa border
  ["No.", "Judul Dokumen", "No. Dokumen", "Keterangan"].forEach((h, i) => {
    setTableHeader(ws, HR, i + 1, h);
    ws.mergeCells(HR, i + 1, HR + 1, i + 1);
    ws.getCell(HR, i + 1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    ws.getCell(HR, i + 1).border = thinBorder;
  });

  // Kolom 5-9 tanpa border
  setTableHeaderNoBorder(ws, HR, 5, "Tgl Efektif");
  ws.mergeCells(HR, 5, HR + 1, 5);
  setTableHeaderNoBorder(ws, HR, 6, "Masa Berlaku");
  ws.mergeCells(HR, 6, HR + 1, 6);
  setTableHeaderNoBorder(ws, HR, 7, "Link File");
  ws.mergeCells(HR, 7, HR, 8);
  ws.getCell(HR, 7).alignment = { horizontal: "center", vertical: "middle" };
  setTableHeaderNoBorder(ws, HR, 9, "Status");
  ws.mergeCells(HR, 9, HR + 1, 9);
  ws.getCell(HR, 9).alignment = { horizontal: "center", vertical: "middle" };

  ws.getRow(HR).height = 20;

  // Header row 2
  // kolom 1-4 border sudah merged dari atas; sub-header 5-9 tanpa border
  setTableHeaderNoBorder(ws, HR + 1, 7, "English");
  setTableHeaderNoBorder(ws, HR + 1, 8, "Indonesian");
  ws.getRow(HR + 1).height = 16;

  let dr = HR + 2;
  if (!docs?.length) {
    ws.mergeCells(dr, 1, dr, 4);
    const ec = ws.getCell(dr, 1);
    ec.value = "Tidak ada data ditemukan.";
    ec.font = {
      name: "Arial",
      size: 10,
      italic: true,
      color: { argb: "888888" },
    };
    ec.alignment = { horizontal: "center", vertical: "middle" };
    ec.border = thinBorder;
    return dr + 1;
  }

  docs.forEach((doc: any, idx: number) => {
    // Kolom A-D: dengan border
    setDataCell(ws, dr, 1, idx + 1, "center", true);
    setDataCell(ws, dr, 2, doc.title, "left", true);
    setDataCell(ws, dr, 3, doc.doc_number, "center", true);
    setDataCell(ws, dr, 4, `Rev. ${doc.revision}`, "center", true);
    // Kolom E-I: tanpa border
    setDataCell(ws, dr, 5, formatDate(doc.effective_date), "center", false);
    setDataCell(ws, dr, 6, formatDate(doc.expiry_date), "center", false);
    setDataCell(ws, dr, 7, "", "center", false);
    setDataCell(ws, dr, 8, "", "center", false);
    setDataCell(
      ws,
      dr,
      9,
      STATUS_LABEL[doc.status] ?? doc.status,
      "center",
      false
    );
    ws.getRow(dr).height = 16;
    dr++;
  });
  return dr;
}

// ─── Tabel MSDS Kimia (row 14+) ──────────────────────────────────────────────
// Border hanya kolom A-D (1-4): No | Judul | No. Dok | Keterangan(Rev)
// Kolom E-K (5-11) tanpa border
function buildMsdsKimiaTable(ws: ExcelJS.Worksheet, docs: any[]) {
  const HR = 14;
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 46;
  ws.getColumn(3).width = 23;
  ws.getColumn(4).width = 15;
  ws.getColumn(5).width = 14;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 12;
  ws.getColumn(9).width = 12;
  ws.getColumn(10).width = 15;
  ws.getColumn(11).width = 12;

  // Kolom 1-4 dengan border
  ["No.", "Judul Dokumen", "No. Dokumen", "Keterangan"].forEach((h, i) => {
    setTableHeader(ws, HR, i + 1, h);
    ws.mergeCells(HR, i + 1, HR + 1, i + 1);
    ws.getCell(HR, i + 1).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
    ws.getCell(HR, i + 1).border = thinBorder;
  });

  // Kolom 5-11 tanpa border
  ["Tgl Efektif", "Tgl Revisi", "Masa Berlaku"].forEach((h, i) => {
    setTableHeaderNoBorder(ws, HR, i + 5, h);
    ws.mergeCells(HR, i + 5, HR + 1, i + 5);
    ws.getCell(HR, i + 5).alignment = {
      horizontal: "center",
      vertical: "middle",
      wrapText: true,
    };
  });
  setTableHeaderNoBorder(ws, HR, 8, "Link File");
  ws.mergeCells(HR, 8, HR, 9);
  ws.getCell(HR, 8).alignment = { horizontal: "center", vertical: "middle" };
  setTableHeaderNoBorder(ws, HR, 10, "Production Type");
  ws.mergeCells(HR, 10, HR + 1, 10);
  ws.getCell(HR, 10).alignment = {
    horizontal: "center",
    vertical: "middle",
    wrapText: true,
  };
  setTableHeaderNoBorder(ws, HR, 11, "Status");
  ws.mergeCells(HR, 11, HR + 1, 11);
  ws.getCell(HR, 11).alignment = { horizontal: "center", vertical: "middle" };
  ws.getRow(HR).height = 20;

  setTableHeaderNoBorder(ws, HR + 1, 8, "English");
  setTableHeaderNoBorder(ws, HR + 1, 9, "Indonesia");
  ws.getRow(HR + 1).height = 16;

  let dr = HR + 2;
  if (!docs?.length) {
    ws.mergeCells(dr, 1, dr, 4);
    const ec = ws.getCell(dr, 1);
    ec.value = "Tidak ada data ditemukan.";
    ec.font = {
      name: "Arial",
      size: 10,
      italic: true,
      color: { argb: "888888" },
    };
    ec.alignment = { horizontal: "center", vertical: "middle" };
    ec.border = thinBorder;
    return dr + 1;
  }

  docs.forEach((doc: any, idx: number) => {
    // Kolom A-D: dengan border
    setDataCell(ws, dr, 1, idx + 1, "center", true);
    setDataCell(ws, dr, 2, doc.title, "left", true);
    setDataCell(ws, dr, 3, doc.doc_number, "center", true);
    setDataCell(ws, dr, 4, `Rev. ${doc.revision}`, "center", true);
    // Kolom E-K: tanpa border
    setDataCell(ws, dr, 5, formatDate(doc.effective_date), "center", false);
    setDataCell(ws, dr, 6, formatDate(doc.revision_date), "center", false);
    setDataCell(ws, dr, 7, formatDate(doc.expiry_date), "center", false);
    setDataCell(ws, dr, 8, "", "center", false);
    setDataCell(ws, dr, 9, "", "center", false);
    setDataCell(
      ws,
      dr,
      10,
      PRODUCTION_TYPE_LABEL[doc.production_type ?? ""] ??
        doc.production_type ??
        "",
      "center",
      false
    );
    setDataCell(
      ws,
      dr,
      11,
      STATUS_LABEL[doc.status] ?? doc.status,
      "center",
      false
    );
    ws.getRow(dr).height = 16;
    dr++;
  });
  return dr;
}

// ─── Tabel QESH (row 12+) ────────────────────────────────────────────────────
// Border hanya kolom A-E (1-5): No | Judul | No. Dok | Rev | Keterangan(dept code)
// Kolom F-H (6-8) tanpa border
function buildQeshTable(ws: ExcelJS.Worksheet, docs: any[]) {
  const HR = 12;
  ws.getColumn(1).width = 4;
  ws.getColumn(2).width = 43;
  ws.getColumn(3).width = 18;
  ws.getColumn(4).width = 8;
  ws.getColumn(5).width = 18;
  ws.getColumn(6).width = 14;
  ws.getColumn(7).width = 14;
  ws.getColumn(8).width = 12;

  // Kolom 1-5 dengan border
  ["No.", "Judul Dokumen", "No. Dokumen", "Rev", "Keterangan"].forEach(
    (h, i) => {
      setTableHeader(ws, HR, i + 1, h);
    }
  );
  // Kolom 6-8 tanpa border
  ["Tgl Efektif", "Link File", "Status"].forEach((h, i) => {
    setTableHeaderNoBorder(ws, HR, i + 6, h);
  });
  ws.getRow(HR).height = 20;

  let dr = HR + 1;
  if (!docs?.length) {
    ws.mergeCells(dr, 1, dr, 5);
    const ec = ws.getCell(dr, 1);
    ec.value = "Tidak ada data ditemukan.";
    ec.font = {
      name: "Arial",
      size: 10,
      italic: true,
      color: { argb: "888888" },
    };
    ec.alignment = { horizontal: "center", vertical: "middle" };
    ec.border = thinBorder;
    return dr + 1;
  }

  docs.forEach((doc: any, idx: number) => {
    // Kolom A-E: dengan border
    setDataCell(ws, dr, 1, idx + 1, "center", true);
    setDataCell(ws, dr, 2, doc.title, "left", true);
    setDataCell(ws, dr, 3, doc.doc_number, "center", true);
    setDataCell(ws, dr, 4, doc.revision, "center", true);
    setDataCell(
      ws,
      dr,
      5,
      (doc.departments as any)?.code ?? "",
      "center",
      true
    );
    // Kolom F-H: tanpa border
    setDataCell(ws, dr, 6, formatDate(doc.effective_date), "center", false);
    setDataCell(ws, dr, 7, "", "center", false);
    setDataCell(
      ws,
      dr,
      8,
      STATUS_LABEL[doc.status] ?? doc.status,
      "center",
      false
    );
    ws.getRow(dr).height = 16;
    dr++;
  });
  return dr;
}

// ─── Main GET ─────────────────────────────────────────────────────────────────
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("category_id") ?? "";
  const typeId = searchParams.get("type_id") ?? "";
  const statusParam = searchParams.get("status") ?? "";
  const departmentParam = searchParams.get("department_id") ?? "";

  // Pecah string koma menjadi array
  const statuses = statusParam.split(",").filter(Boolean);
  const departmentIds = departmentParam.split(",").filter(Boolean);

  if (!categoryId || !typeId || statuses.length === 0) {
    return NextResponse.json(
      { error: "Filter kategori, jenis, dan status wajib diisi." },
      { status: 400 }
    );
  }

  const { data: categoryData } = await supabaseAdmin
    .from("categories")
    .select("name")
    .eq("id", categoryId)
    .single();
  const { data: typeData } = await supabaseAdmin
    .from("document_types")
    .select("name")
    .eq("id", typeId)
    .single();

  const categoryName = categoryData?.name ?? "";
  const typeName = typeData?.name ?? "";
  const template = TYPE_NAME_TO_TEMPLATE[typeName] ?? "default";

  // ── Ambil SEMUA dokumen yang match filter, dengan pagination manual ──────
  // PENTING: Supabase/PostgREST punya default "max-rows" = 1000 baris per
  // request. Kalau query dikirim tanpa .range() dan hasilnya lebih dari
  // 1000 baris, sisanya akan terpotong secara DIAM-DIAM (tanpa error) —
  // ini yang menyebabkan file export sebelumnya selalu mentok di 1000 baris
  // meskipun total dokumen di database lebih banyak. Loop di bawah ini
  // menarik data per halaman 1000 baris sampai benar-benar habis, sama
  // seperti pola yang sudah dipakai di fungsi-fungsi lain (getDocumentsByCategory,
  // getAllDocumentsForImport, fetchDeletedDocuments, dll di app/lib/data.ts).
  const PAGE = 1000;
  let docs: any[] = [];
  let from = 0;

  while (true) {
    let query = supabaseAdmin
      .from("documents")
      .select(
        `
        id, doc_number, title, revision, effective_date,
        revision_date, expiry_date, production_type, status,
        departments(code, name)
      `
      )
      .eq("category_id", categoryId)
      .eq("type_id", typeId)
      .in("status", statuses)
      .order("doc_number")
      .range(from, from + PAGE - 1);

    if (departmentIds.length > 0) {
      query = query.in("department_id", departmentIds);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json(
        { error: "Gagal mengambil data." },
        { status: 500 }
      );
    }
    if (!data || data.length === 0) break;

    docs = [...docs, ...data];
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const wb = new ExcelJS.Workbook();
  wb.creator = "DCS System";
  wb.created = new Date();

  const ws = wb.addWorksheet("Daftar Induk Dokumen", {
    pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
  });

  let lastDataRow = 1;
  // footerCol: kolom terakhir yang di-border (D=4 untuk MSDS, E=5 untuk QESH)
  let footerCol = 4;
  let footerRef = "FL-MRP-018, REV 01";
  let freezeRow = 16;

  if (template === "msds_benang") {
    buildMsdsHeader(ws, categoryName, typeName);
    lastDataRow = buildMsdsBenangTable(ws, docs);
    footerRef = "FL-MRP-018, REV 01";
    footerCol = 4; // kolom D
    freezeRow = 16;
  } else if (template === "msds_kimia") {
    buildMsdsHeader(ws, categoryName, typeName);
    lastDataRow = buildMsdsKimiaTable(ws, docs);
    footerRef = "FL-MRP-018, REV 01";
    footerCol = 4; // kolom D
    freezeRow = 16;
  } else {
    // QESH (dan fallback)
    buildQeshHeader(ws, typeName);
    lastDataRow = buildQeshTable(ws, docs);
    footerRef = "FL-MRP-003, REV 03";
    footerCol = 5; // kolom E
    freezeRow = 13;
  }

  // Footer referensi form — ditempatkan di kolom terakhir yang di-border
  const footerRow = lastDataRow + 1;
  ws.getCell(footerRow, footerCol).value = footerRef;
  ws.getCell(footerRow, footerCol).font = { name: "Arial", size: 11 };
  ws.getCell(footerRow, footerCol).alignment = { horizontal: "center" };

  // Freeze header
  ws.views = [{ state: "frozen", ySplit: freezeRow - 1 }];

  const buffer = await wb.xlsx.writeBuffer();

  // Sesuaikan nama file jika status yang dipilih lebih dari 1
  const statusLabel = statuses.length > 1 ? "MultiStatus" : statuses[0];
  const safeName = `${categoryName}_${typeName}_${statusLabel}`.replace(
    /\s+/g,
    "_"
  );

  const filename = `daftar_induk_${safeName}_${
    new Date().toISOString().split("T")[0]
  }.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    status: 200,
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
