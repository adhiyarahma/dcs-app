import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'File tidak ditemukan.' }, { status: 400 });

    const category_id = formData.get('category_id') as string;
    const type_id = formData.get('type_id') as string;
    const uploaded_by = formData.get('uploaded_by') as string;

    if (!category_id || !type_id) {
      return NextResponse.json({ error: 'Kategori dan jenis dokumen wajib dipilih.' }, { status: 400 });
    }

    const { data: cat } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .eq('id', category_id)
      .single();

    const { data: type } = await supabaseAdmin
      .from('document_types')
      .select('id, name')
      .eq('id', type_id)
      .single();

    if (!cat || !type) {
      return NextResponse.json({ error: 'Kategori atau jenis dokumen tidak valid.' }, { status: 400 });
    }

    const categoryName = cat.name.toLowerCase();
    const typeName = type.name.toLowerCase();
    const isMSDS = categoryName.includes('msds');
    const showRevisionDate = isMSDS && typeName.includes('kimia');
    const showExpiryDate = isMSDS;

    const buffer = Buffer.from(await file.arrayBuffer());
    const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows: any[] = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rows.length === 0) return NextResponse.json({ error: 'File Excel kosong.' }, { status: 400 });

    // Ambil semua departemen sekali (hindari N+1 query)
    const { data: allDeps } = await supabaseAdmin
      .from('departments')
      .select('id, code');
    const deptMap: Record<string, string> = Object.fromEntries(
      (allDeps ?? []).map((d: { code: string; id: string }) => [d.code.toLowerCase(), d.id])
    );

    let success = 0;
    const errors: string[] = [];

    const formatDate = (val: any): string | null => {
      if (!val) return null;
      if (val instanceof Date) return val.toISOString().slice(0, 10);
      const str = String(val).trim();
      if (!str) return null;
      const parts = str.split('/');
      if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      return str.slice(0, 10);
    };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2;
      try {
        const doc_number = String(row['No. Dokumen'] ?? '').trim();
        const title = String(row['Judul'] ?? '').trim();
        const department_code = String(row['Kode Bagian'] ?? '').trim();
        const revision = parseInt(row['Revisi'] ?? '0');
        const effective_date_raw = row['Tgl Efektif'];
        const revision_date_raw = showRevisionDate ? (row['Tgl Revisi'] ?? null) : null;
        const expiry_date_raw = showExpiryDate ? (row['Masa Berlaku'] ?? null) : null;

        if (!doc_number || !title || effective_date_raw === '') {
          errors.push(`Baris ${rowNum}: Field wajib (No. Dokumen, Judul, Tgl Efektif) belum lengkap.`);
          continue;
        }

        let department_id: string | null = null;
        if (department_code) {
          department_id = deptMap[department_code.toLowerCase()] ?? null;
          if (!department_id) {
            errors.push(`Baris ${rowNum}: Kode Bagian "${department_code}" tidak ditemukan.`);
            continue;
          }
        }

        const effective_date = formatDate(effective_date_raw);
        const revision_date = formatDate(revision_date_raw);
        const expiry_date = formatDate(expiry_date_raw);

        if (!effective_date) {
          errors.push(`Baris ${rowNum}: Format Tgl Efektif tidak valid.`);
          continue;
        }

        const { data: existing } = await supabaseAdmin
          .from('documents')
          .select('id')
          .eq('doc_number', doc_number)
          .single();

        if (existing) {
          await supabaseAdmin
            .from('documents')
            .update({
              title, type_id, department_id, revision,
              effective_date, revision_date, expiry_date,
              updated_at: new Date().toISOString(),
            })
            .eq('doc_number', doc_number);
        } else {
          await supabaseAdmin
            .from('documents')
            .insert({
              doc_number, title, category_id, type_id, department_id,
              revision, effective_date, revision_date, expiry_date,
              uploaded_by, status: 'terbaru',
            });
        }
        success++;
      } catch (err: any) {
        errors.push(`Baris ${rowNum}: ${err.message}`);
      }
    }

    return NextResponse.json({ success, errors, total: rows.length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
