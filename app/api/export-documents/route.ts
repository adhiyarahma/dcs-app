import { NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    const { data: docs, error } = await supabaseAdmin
      .from('documents')
      .select(`
        doc_number,
        title,
        revision,
        effective_date,
        revision_date,
        expiry_date,
        status,
        categories!inner(name),
        document_types!inner(name),
        departments(code)
      `)
      .neq('status', 'dihapus')
      .order('doc_number');

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (docs ?? []).map((d: any) => ({
      'No. Dokumen': d.doc_number,
      'Judul': d.title,
      'Kategori': d.categories?.name ?? '',
      'Jenis Dokumen': d.document_types?.name ?? '',
      'Kode Bagian': d.departments?.code ?? '',
      'Revisi': d.revision,
      'Tgl Efektif': d.effective_date ? new Date(d.effective_date).toLocaleDateString('id-ID') : '',
      'Tgl Revisi': d.revision_date ? new Date(d.revision_date).toLocaleDateString('id-ID') : '',
      'Masa Berlaku': d.expiry_date ? new Date(d.expiry_date).toLocaleDateString('id-ID') : '',
      'Status': d.status,
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    ws['!cols'] = [{ wch: 20 },{ wch: 45 },{ wch: 15 },{ wch: 25 },{ wch: 12 },{ wch: 8 },{ wch: 14 },{ wch: 14 },{ wch: 14 },{ wch: 10 }];
    XLSX.utils.book_append_sheet(wb, ws, 'Dokumen');

    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="dokumen-${new Date().toISOString().slice(0, 10)}.xlsx"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
