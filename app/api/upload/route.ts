import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get('file') as File;
  const path = formData.get('path') as string;

  if (!file || !path) {
    return NextResponse.json({ error: 'File atau path tidak ada.' }, { status: 400 });
  }

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error } = await supabase.storage
    .from('documents')
    .upload(path, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const { data } = supabase.storage.from('documents').getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl });
}
