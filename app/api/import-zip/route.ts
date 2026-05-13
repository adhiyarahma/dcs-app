import { NextRequest, NextResponse } from 'next/server';
import unzipper from 'unzipper';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';
import { Readable } from 'stream';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    if (!file) return NextResponse.json({ error: 'File ZIP tidak ditemukan.' }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const directory = await unzipper.Open.buffer(buffer);

    let success = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of directory.files) {
      // Skip folder dan file tersembunyi
      if (entry.type === 'Directory') continue;
      const filename = entry.path.split('/').pop() ?? '';
      if (filename.startsWith('.') || filename.startsWith('__')) continue;

      // Parse nama file: {doc_number}_{label}.{ext}
      const dotIdx = filename.lastIndexOf('.');
      if (dotIdx === -1) { errors.push(`${filename}: ekstensi tidak ditemukan.`); continue; }

      const ext = filename.slice(dotIdx + 1).toLowerCase();
      const nameWithoutExt = filename.slice(0, dotIdx);
      const underscoreIdx = nameWithoutExt.lastIndexOf('_');

      let doc_number: string;
      let label: string;

      if (underscoreIdx === -1) {
        // Tidak ada underscore — gunakan ext sebagai label
        doc_number = nameWithoutExt;
        label = ext;
      } else {
        doc_number = nameWithoutExt.slice(0, underscoreIdx);
        label = nameWithoutExt.slice(underscoreIdx + 1).toLowerCase();
      }

      if (!doc_number) { errors.push(`${filename}: format nama tidak valid (gunakan doc_number_label.ext).`); continue; }

      // Cari dokumen di database
      const docs = await sql`SELECT id, doc_number FROM documents WHERE doc_number = ${doc_number} LIMIT 1`;
      if (!docs[0]) { errors.push(`${filename}: dokumen "${doc_number}" tidak ditemukan di database.`); continue; }

      const docId = docs[0].id;

      // Upload ke Supabase
      const fileBuffer = await entry.buffer();
      const contentType = ext === 'pdf' ? 'application/pdf'
        : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/octet-stream';

      const storagePath = `imports/${doc_number}/${label}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, { contentType, upsert: true });

      if (uploadError) { errors.push(`${filename}: gagal upload — ${uploadError.message}`); continue; }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      // Hapus file lama dengan label sama jika ada
      await sql`DELETE FROM document_files WHERE document_id = ${docId} AND file_label = ${label}`;

      // Simpan ke database
      await sql`
        INSERT INTO document_files (document_id, file_label, file_url, file_name, file_type)
        VALUES (${docId}, ${label}, ${publicUrl}, ${filename}, ${ext})
      `;

      success++;
    }

    return NextResponse.json({ success, skipped, errors, total: directory.files.filter(e => e.type !== 'Directory').length });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
