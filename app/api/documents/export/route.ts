// app/api/documents/export/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';
import ExcelJS from 'exceljs';

// ── Definisi kolom (sinkron dengan import) ──────────────────
const FIXED_COLUMNS = [
  { label: 'No',            field: 'no',             width: 6  },
  { label: 'Judul Dokumen', field: 'title',          width: 40 },
  { label: 'No. Dokumen',   field: 'doc_number',     width: 20 },
  { label: 'Revisi ke-',    field: 'revision',       width: 10 },
  { label: 'Tgl Efektif',   field: 'effective_date', width: 15 },
  { label: 'Status',        field: 'status',         width: 14 },
];

const EXTRA_COLUMNS: Record<string, { label: string; field: string; width: number }[]> = {
  dokumen_qesh: [
    { label: 'PIC (Bagian/Departement)', field: 'department',     width: 28 },
  ],
  msds_kimia: [
    { label: 'Tgl Revisi',              field: 'revision_date',   width: 15 },
    { label: 'Masa Berlaku',            field: 'expiry_date',     width: 15 },
    { label: 'Production Type',         field: 'production_type', width: 22 },
  ],
  msds_benang: [
    { label: 'Masa Berlaku',            field: 'expiry_date',     width: 15 },
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

const STATUS_LABEL: Record<string, string> = {
  terbaru:    'Terbaru',
  kadaluarsa: 'Kadaluarsa',
  dihapus:    'Dihapus',
};

const STATUS_COLOR: Record<string, string> = {
  terbaru:    'C6EFCE',  // hijau muda
  kadaluarsa: 'FFEB9C',  // kuning
  dihapus:    'FFC7CE',  // merah muda
};

function formatDate(val: string | null | undefined): string {
  if (!val) return '';
  const d = new Date(val);
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const categoryId   = searchParams.get('category_id') ?? '';
  const typeId       = searchParams.get('type_id') ?? '';
  const statusFilter = searchParams.get('status') ?? '';
  const departmentId = searchParams.get('department_id') ?? '';

  if (!categoryId || !typeId || !statusFilter) {
    return NextResponse.json({ error: 'Filter kategori, jenis, dan status wajib diisi.' }, { status: 400 });
  }

  // ── Ambil meta kategori & jenis ──
  const { data: categoryData } = await supabaseAdmin
    .from('categories').select('name').eq('id', categoryId).single();
  const { data: typeData } = await supabaseAdmin
    .from('document_types').select('name').eq('id', typeId).single();

  const categoryName = categoryData?.name ?? '';
  const typeName     = typeData?.name ?? '';
  const extraKey     = DOCUMENT_TYPE_KEY[typeName] ?? '';
  const extraCols    = EXTRA_COLUMNS[extraKey] ?? [];
  const columns      = [...FIXED_COLUMNS, ...extraCols];

  // ── Query dokumen ──
  let query = supabaseAdmin
    .from('documents')
    .select(`
      id, doc_number, title, revision, effective_date,
      revision_date, expiry_date, production_type, status,
      departments(code, name),
      users(name)
    `)
    .eq('category_id', categoryId)
    .eq('type_id', typeId)
    .eq('status', statusFilter)
    .order('doc_number');

  if (departmentId) query = query.eq('department_id', departmentId);

  const { data: docs, error } = await query;
  if (error) return NextResponse.json({ error: 'Gagal mengambil data.' }, { status: 500 });

  // ── Build workbook ──
  const wb = new ExcelJS.Workbook();
  wb.creator = 'DCS System';
  wb.created = new Date();

  const ws = wb.addWorksheet('Export Dokumen', {
    properties: { tabColor: { argb: '1E3A5F' } },
    pageSetup: { orientation: 'landscape', fitToPage: true, fitToWidth: 1 },
  });

  const borderStyle = {
    top:    { style: 'thin' as const, color: { argb: 'BFBFBF' } },
    bottom: { style: 'thin' as const, color: { argb: 'BFBFBF' } },
    left:   { style: 'thin' as const, color: { argb: 'BFBFBF' } },
    right:  { style: 'thin' as const, color: { argb: 'BFBFBF' } },
  };

  // ── Baris 1: Judul laporan ──
  ws.mergeCells(1, 1, 1, columns.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value     = `Export Dokumen  —  ${categoryName} › ${typeName}  |  Status: ${STATUS_LABEL[statusFilter] ?? statusFilter}  |  Tanggal Export: ${new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })}`;
  titleCell.font      = { name: 'Arial', bold: true, size: 11, color: { argb: 'FFFFFF' } };
  titleCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: '1E3A5F' } };
  titleCell.alignment = { horizontal: 'left', vertical: 'middle', indent: 1 };
  ws.getRow(1).height = 26;

  // ── Baris 2: Header kolom ──
  columns.forEach((col, i) => {
    const colNum = i + 1;
    ws.getColumn(colNum).width = col.width;

    const cell      = ws.getCell(2, colNum);
    cell.value      = col.label;
    cell.font       = { name: 'Arial', bold: true, size: 10, color: { argb: 'FFFFFF' } };
    cell.fill       = { type: 'pattern', pattern: 'solid', fgColor: { argb: '2E4A6F' } };
    cell.alignment  = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border     = borderStyle;
  });
  ws.getRow(2).height = 22;

  // ── Baris 3+: Data ──
  if (!docs || docs.length === 0) {
    ws.mergeCells(3, 1, 3, columns.length);
    const emptyCell     = ws.getCell(3, 1);
    emptyCell.value     = 'Tidak ada data ditemukan untuk filter yang dipilih.';
    emptyCell.font      = { name: 'Arial', italic: true, size: 10, color: { argb: '888888' } };
    emptyCell.alignment = { horizontal: 'center', vertical: 'middle' };
    ws.getRow(3).height = 20;
  } else {
    docs.forEach((doc: any, rowIdx: number) => {
      const rowNum    = rowIdx + 3;
      const isEven    = rowIdx % 2 === 0;
      const rowBg     = isEven ? 'FFFFFF' : 'F5F7FA';
      const statusBg  = STATUS_COLOR[doc.status] ?? rowBg;
      const deptLabel = doc.departments
        ? `${doc.departments.code} - ${doc.departments.name}`
        : '';

      const valueMap: Record<string, unknown> = {
        no:              rowIdx + 1,
        title:           doc.title,
        doc_number:      doc.doc_number,
        revision:        doc.revision,
        effective_date:  formatDate(doc.effective_date),
        status:          STATUS_LABEL[doc.status] ?? doc.status,
        department:      deptLabel,
        revision_date:   formatDate(doc.revision_date),
        expiry_date:     formatDate(doc.expiry_date),
        production_type: doc.production_type ?? '',
      };

      columns.forEach((col, colIdx) => {
        const colNum = colIdx + 1;
        const cell   = ws.getCell(rowNum, colNum);
        cell.value = (valueMap[col.field] ?? '') as ExcelJS.CellValue;
        cell.font    = { name: 'Arial', size: 10 };
        cell.border  = borderStyle;
        cell.alignment = {
          horizontal: col.field === 'no' || col.field === 'revision' ? 'center' : 'left',
          vertical: 'middle',
        };

        // Warna status kolom khusus
        if (col.field === 'status') {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: statusBg } };
          cell.font = { name: 'Arial', size: 10, bold: true,
            color: { argb: doc.status === 'terbaru' ? '375623' : doc.status === 'kadaluarsa' ? '7F6000' : '9C0006' }
          };
        } else {
          cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: rowBg } };
        }
      });

      ws.getRow(rowNum).height = 18;
    });

    // ── Baris total ──
    const totalRow = docs.length + 3;
    ws.mergeCells(totalRow, 1, totalRow, columns.length);
    const totalCell     = ws.getCell(totalRow, 1);
    totalCell.value     = `Total: ${docs.length} dokumen`;
    totalCell.font      = { name: 'Arial', bold: true, size: 10, color: { argb: '1E3A5F' } };
    totalCell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'D9E8F5' } };
    totalCell.alignment = { horizontal: 'right', vertical: 'middle', indent: 1 };
    totalCell.border    = borderStyle;
    ws.getRow(totalRow).height = 20;
  }

  // ── Freeze header ──
  ws.views = [{ state: 'frozen', ySplit: 2 }];

  // ── Kirim file ──
  const buffer   = await wb.xlsx.writeBuffer();
  const safeName = `${categoryName}_${typeName}_${statusFilter}`.replace(/\s+/g, '_');
  const filename  = `export_dokumen_${safeName}_${new Date().toISOString().split('T')[0]}.xlsx`;

  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  });
}
