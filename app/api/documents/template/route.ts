// app/api/documents/template/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';
import ExcelJS from 'exceljs';

// ── Definisi kolom (sinkron dengan generate_template.py & import-actions.ts) ──
const FIXED_COLUMNS = [
  { label: 'No',                       field: 'no',             required: true,  width: 8  },
  { label: 'Judul Dokumen',            field: 'title',          required: true,  width: 35 },
  { label: 'No. Dokumen',              field: 'doc_number',     required: true,  width: 20 },
  { label: 'Revisi ke-',               field: 'revision',       required: true,  width: 10 },
  { label: 'Tgl Efektif',              field: 'effective_date', required: true,  width: 15 },
  { label: 'Status',                   field: 'status',         required: true,  width: 15 },
];

const EXTRA_COLUMNS: Record<string, { label: string; field: string; required: boolean; width: number }[]> = {
  dokumen_qesh: [
    { label: 'PIC (Bagian/Departement)', field: 'department_id',   required: true,  width: 25 },
  ],
  msds_kimia: [
    { label: 'Tgl Revisi',              field: 'revision_date',   required: true,  width: 15 },
    { label: 'Masa Berlaku',            field: 'expiry_date',     required: true,  width: 15 },
    { label: 'Production Type',         field: 'production_type', required: true,  width: 20 },
  ],
  msds_benang: [
    { label: 'Masa Berlaku',            field: 'expiry_date',     required: true,  width: 15 },
  ],
};

const DOCUMENT_TYPE_KEY: Record<string, string> = {
  'Instruksi Kerja':   'dokumen_qesh',
  'Formulir':          'dokumen_qesh',
  'Spesifikasi':       'dokumen_qesh',
  'Prosedur':          'dokumen_qesh',
  'Panduan':           'dokumen_qesh',
  'Job Description':   'dokumen_qesh',
  'Job Qualification': 'dokumen_qesh',
  'Pedoman':           'dokumen_qesh',
  'MSDS Kimia':        'msds_kimia',
  'MSDS Benang':       'msds_benang',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const docTypeName = searchParams.get('type') ?? '';
  const categoryName = searchParams.get('category') ?? '';

  if (!docTypeName) {
    return NextResponse.json({ error: 'Parameter type wajib diisi' }, { status: 400 });
  }

  // Ambil daftar departemen
  const { data: departments } = await supabaseAdmin
    .from('departments')
    .select('code, name')
    .order('code');
  const deptList = (departments ?? []).map((d: { code: string; name: string }) => `${d.code} - ${d.name}`);

  // Tentukan kolom
  const extraKey = DOCUMENT_TYPE_KEY[docTypeName] ?? '';
  const extras = EXTRA_COLUMNS[extraKey] ?? [];
  const columns = [...FIXED_COLUMNS, ...extras];

  // Build workbook
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DCS System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Import Dokumen', {
    properties: { tabColor: { argb: '1E3A5F' } },
  });

  // ── Info baris 1 ──
  ws.mergeCells(1, 1, 1, columns.length);
  const infoCell = ws.getCell(1, 1);
  infoCell.value = `Template Import Dokumen  |  Kategori: ${categoryName}  |  Jenis: ${docTypeName}  |  Kolom hijau = wajib, Kuning = opsional  |  Data mulai baris 4`;
  infoCell.font  = { name: 'Arial', bold: true, size: 10, color: { argb: '1E3A5F' } };
  infoCell.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E8F5' } };
  infoCell.alignment = { horizontal: 'left', vertical: 'middle' };
  ws.getRow(1).height = 22;

  // ── Header baris 2 + sub-header baris 3 ──
  columns.forEach((col, i) => {
    const colNum = i + 1;
    ws.getColumn(colNum).width = col.width;

    // Header
    const h = ws.getCell(2, colNum);
    h.value     = col.label;
    h.font      = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFF' } };
    h.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
    h.alignment = { horizontal: 'center', vertical: 'middle' };
    h.border    = {
      top: { style: 'thin', color: { argb: 'BFBFBF' } },
      bottom: { style: 'thin', color: { argb: 'BFBFBF' } },
      left: { style: 'thin', color: { argb: 'BFBFBF' } },
      right: { style: 'thin', color: { argb: 'BFBFBF' } },
    };

    // Sub-header
    const s = ws.getCell(3, colNum);
    s.value     = col.required ? '(wajib diisi)' : '(opsional)';
    s.font      = { name: 'Arial', size: 9, italic: true, color: { argb: col.required ? '375623' : '7F6000' } };
    s.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: col.required ? 'C6EFCE' : 'FFEB9C' } };
    s.alignment = { horizontal: 'center', vertical: 'middle' };
    s.border    = h.border;
  });

  ws.getRow(2).height = 24;
  ws.getRow(3).height = 16;

  // ── Area data baris 4-103 ──
  const borderStyle = {
    top: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
    bottom: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
    left: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
    right: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
  };

  for (let row = 4; row <= 103; row++) {
    columns.forEach((col, i) => {
      const colNum = i + 1;
      const cell = ws.getCell(row, colNum);
      cell.font      = { name: 'Arial', size: 10 };
      cell.alignment = { horizontal: 'left', vertical: 'middle' };
      cell.border    = borderStyle;

      // Nomor otomatis di kolom 1
      if (col.field === 'no') cell.value = row - 3;
    });
    ws.getRow(row).height = 18;
  }

  // ── Dropdown Status ──
  const statusColIdx = columns.findIndex(c => c.field === 'status') + 1;
  if (statusColIdx > 0) {
    const statusColLetter = ws.getColumn(statusColIdx).letter;
    for (let row = 4; row <= 103; row++) {
      ws.getCell(row, statusColIdx).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: ['"Terbaru,Kadaluarsa,Dihapus"'],
        showErrorMessage: true,
        errorTitle: 'Nilai tidak valid',
        error: 'Pilih salah satu: Terbaru, Kadaluarsa, atau Dihapus',
      };
    }
  }

  // ── Dropdown Departemen ──
  const deptColIdx = columns.findIndex(c => c.field === 'department_id') + 1;
  if (deptColIdx > 0 && deptList.length > 0) {
    // Sheet referensi tersembunyi
    const refWs = wb.addWorksheet('_ref_departments');
    refWs.state = 'hidden';
    deptList.forEach((dept, i) => {
      refWs.getCell(i + 1, 1).value = dept;
    });

    for (let row = 4; row <= 103; row++) {
      ws.getCell(row, deptColIdx).dataValidation = {
        type: 'list',
        allowBlank: true,
        formulae: [`_ref_departments!$A$1:$A$${deptList.length}`],
        showErrorMessage: true,
        errorTitle: 'Departemen tidak valid',
        error: 'Pilih departemen dari daftar yang tersedia',
      };
    }
  }

  // ── Freeze header ──
  ws.views = [{ state: 'frozen', ySplit: 3 }];

  // ── Kirim file ──
  const buffer = await wb.xlsx.writeBuffer();
  const filename = `template_${docTypeName.replace(/\s+/g, '_')}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
