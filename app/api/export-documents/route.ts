import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function GET() {
  try {
    const docs = await sql`
      SELECT
        d.doc_number AS "No. Dokumen", d.title AS "Judul",
        c.name AS "Kategori", dt.name AS "Jenis Dokumen",
        dep.code AS "Kode Bagian", d.revision AS "Revisi",
        TO_CHAR(d.effective_date, 'DD/MM/YYYY') AS "Tgl Efektif",
        TO_CHAR(d.revision_date, 'DD/MM/YYYY') AS "Tgl Revisi",
        TO_CHAR(d.expiry_date, 'DD/MM/YYYY') AS "Masa Berlaku",
        d.status AS "Status"
      FROM documents d
      JOIN categories c ON c.id = d.category_id
      JOIN document_types dt ON dt.id = d.type_id
      LEFT JOIN departments dep ON dep.id = d.department_id
      WHERE d.status != 'dihapus'
      ORDER BY d.doc_number ASC
    `;
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(docs);
    ws['!cols'] = [{ wch: 20 },{ wch: 45 },{ wch: 15 },{ wch: 25 },{ wch: 12 },{ wch: 8 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Dokumen');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="dokumen-${new Date().toISOString().slice(0,10)}.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
