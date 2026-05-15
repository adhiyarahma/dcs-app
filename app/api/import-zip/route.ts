import { NextRequest, NextResponse } from 'next/server';
import unzipper from 'unzipper';
import { createClient } from '@supabase/supabase-js';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

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
      if (entry.type === 'Directory') continue;
      const filename = entry.path.split('/').pop() ?? '';
      if (filename.startsWith('.') || filename.startsWith('__')) continue;

      const dotIdx = filename.lastIndexOf('.');
      if (dotIdx === -1) { errors.push(`${filename}: ekstensi tidak ditemukan.`); continue; }

      const ext = filename.slice(dotIdx + 1).toLowerCase();
      const nameWithoutExt = filename.slice(0, dotIdx);
      const underscoreIdx = nameWithoutExt.lastIndexOf('_');

      let doc_number: string;
      let label: string;

      if (underscoreIdx === -1) {
        doc_number = nameWithoutExt;
        label = ext;
      } else {
        doc_number = nameWithoutExt.slice(0, underscoreIdx);
        label = nameWithoutExt.slice(underscoreIdx + 1).toLowerCase();
      }

      if (!doc_number) { errors.push(`${filename}: format nama tidak valid (gunakan doc_number_label.ext).`); continue; }

      // Ambil dokumen + category + type sekaligus
      const docs = await sql`
        SELECT d.id, d.doc_number, c.name AS category_name, dt.name AS type_name
        FROM documents d
        JOIN categories c ON c.id = d.category_id
        JOIN document_types dt ON dt.id = d.type_id
        WHERE d.doc_number = ${doc_number}
        LIMIT 1
      `;
      if (!docs[0]) {
        errors.push(`${filename}: dokumen "${doc_number}" tidak ditemukan di database.`);
        continue;
      }

      const docId = docs[0].id;
      const categorySlug = slugify(docs[0].category_name);
      const typeSlug = slugify(docs[0].type_name);
      // Encode slash pada doc_number agar tidak buat subfolder tak terduga
      const safeDocNumber = doc_number.replace(/\//g, '-').replace(/\s+/g, '_');

      const fileBuffer = await entry.buffer();
      const contentType =
        ext === 'pdf' ? 'application/pdf'
        : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/octet-stream';

      // Path konsisten: category/doc_type/doc_number/label-timestamp.ext
      const storagePath = `${categorySlug}/${typeSlug}/${safeDocNumber}/${label}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(storagePath, fileBuffer, { contentType, upsert: true });

      if (uploadError) {
        errors.push(`${filename}: gagal upload — ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      await sql`DELETE FROM document_files WHERE document_id = ${docId} AND file_label = ${label}`;
      await sql`
        INSERT INTO document_files (document_id, file_label, file_url, file_name, file_type)
        VALUES (${docId}, ${label}, ${publicUrl}, ${filename}, ${ext})
      `;

      success++;
    }

    return NextResponse.json({
      success,
      skipped,
      errors,
      total: directory.files.filter(e => e.type !== 'Directory').length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
