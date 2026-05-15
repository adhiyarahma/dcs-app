import { NextRequest, NextResponse } from 'next/server';
import unzipper from 'unzipper';
import { supabaseAdmin } from '@/app/lib/supabase';

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

      if (!doc_number) {
        errors.push(`${filename}: format nama tidak valid (gunakan doc_number_label.ext).`);
        continue;
      }

      const { data: doc } = await supabaseAdmin
        .from('documents')
        .select('id, doc_number, categories!inner(name), document_types!inner(name)')
        .eq('doc_number', doc_number)
        .single();

      if (!doc) {
        errors.push(`${filename}: dokumen "${doc_number}" tidak ditemukan di database.`);
        continue;
      }

      const docId = doc.id;
      const categorySlug = slugify((doc as any).categories.name);
      const typeSlug = slugify((doc as any).document_types.name);
      const safeDocNumber = doc_number.replace(/\//g, '-').replace(/\s+/g, '_');

      const fileBuffer = await entry.buffer();
      const contentType =
        ext === 'pdf' ? 'application/pdf'
        : ext === 'docx' ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        : ext === 'xlsx' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : 'application/octet-stream';

      const storagePath = `${categorySlug}/${typeSlug}/${safeDocNumber}/${label}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabaseAdmin.storage
        .from('documents')
        .upload(storagePath, fileBuffer, { contentType, upsert: true });

      if (uploadError) {
        errors.push(`${filename}: gagal upload — ${uploadError.message}`);
        continue;
      }

      const { data: urlData } = supabaseAdmin.storage.from('documents').getPublicUrl(storagePath);
      const publicUrl = urlData.publicUrl;

      await supabaseAdmin
        .from('document_files')
        .delete()
        .eq('document_id', docId)
        .eq('file_label', label);

      await supabaseAdmin
        .from('document_files')
        .insert({ document_id: docId, file_label: label, file_url: publicUrl, file_name: filename, file_type: ext });

      success++;
    }

    return NextResponse.json({
      success,
      skipped,
      errors,
      total: directory.files.filter((e: any) => e.type !== 'Directory').length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
