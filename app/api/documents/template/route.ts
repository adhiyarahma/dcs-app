// app/api/documents/template/route.ts
import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/app/lib/supabase";
import ExcelJS from "exceljs";

// ─── Mapping jenis dokumen → template key ─────────────────────────────────────
type TemplateKey = "msds_benang" | "msds_kimia" | "qesh";

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
// border hanya sampai kolom terakhir yang di-border (D untuk MSDS, E untuk QESH)
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

// ─── Header MSDS (Perbaikan: Tambahkan pengecekan dinamis) ────────────────────
function buildMsdsHeader(
  ws: ExcelJS.Worksheet,
  categoryName: string,
  typeName: string
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

  const isMsds = categoryName.toLowerCase().includes("msds");
  // Ambil semua tipe yang sudah ada di checklist
  const knownMsdsTypes = MSDS_CHECKLIST.flat().filter(
    (item) => item && !item.includes("…")
  );
  const isOtherType = !isMsds && !knownMsdsTypes.includes(typeName);

  MSDS_CHECKLIST.forEach(([left, right], i) => {
    const rowNum = 5 + i;
    ws.getRow(rowNum).height = 15.75;

    // Cek sisi kiri
    const isCheckedLeft =
      (left === "MSDS (LKB)" && isMsds) || left === typeName;
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
      const displayText = isOther ? typeName : right;
      const isCheckedRight = isOther ? true : right === typeName;
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
