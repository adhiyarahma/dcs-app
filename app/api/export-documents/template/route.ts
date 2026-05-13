import { NextResponse, NextRequest } from 'next/server';
import * as XLSX from 'xlsx';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category_id = searchParams.get('category_id');
    const type_id = searchParams.get('type_id');

    if (!category_id || !type_id) {
      return NextResponse.json({ error: 'Pilih kategori dan jenis dokumen terlebih dahulu.' }, { status: 400 });
    }

    const cats = await sql`SELECT name FROM categories WHERE id = ${category_id} LIMIT 1`;
    const types = await sql`SELECT name FROM document_types WHERE id = ${type_id} LIMIT 1`;
    if (!cats[0] || !types[0]) {
      return NextResponse.json({ error: 'Kategori atau jenis tidak valid.' }, { status: 400 });
    }

    const categoryName = cats[0].name.toLowerCase();
    const typeName = types[0].name.toLowerCase();
    const isMSDS = categoryName.includes('msds');
    const showRevisionDate = isMSDS && typeName.includes('kimia');
    const showExpiryDate = isMSDS;
    const showDepartment = !isMSDS;

    const wb = XLSX.utils.book_new();
    const row = {
      'No. Dokumen': 'DOC-001',
      'Judul': 'Contoh Judul Dokumen',
      ...(showDepartment ? { 'Kode Bagian': 'HRD' } : {}),
      'Revisi': 0,
      'Tgl Efektif': '01/01/2024',
      ...(showRevisionDate ? { 'Tgl Revisi': '01/01/2025' } : {}),
      ...(showExpiryDate ? { 'Masa Berlaku': '01/01/2026' } : {}),
    };

    const wsTemplate = XLSX.utils.json_to_sheet([row]);
    wsTemplate['!cols'] = Object.keys(row).map(k => ({ wch: k === 'Judul' ? 45 : k === 'No. Dokumen' ? 20 : 16 }));
    XLSX.utils.book_append_sheet(wb, wsTemplate, 'Template');

    if (showDepartment) {
      const deps = await sql`SELECT code AS "Kode Bagian", name AS "Nama Bagian" FROM departments ORDER BY code`;
      const wsDeps = XLSX.utils.json_to_sheet(deps);
      wsDeps['!cols'] = [{ wch: 15 }, { wch: 30 }];
      XLSX.utils.book_append_sheet(wb, wsDeps, 'Ref - Bagian');
    }

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    const filename = `template-${cats[0].name}-${types[0].name}.xlsx`.replace(/\s+/g, '-').toLowerCase();

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
