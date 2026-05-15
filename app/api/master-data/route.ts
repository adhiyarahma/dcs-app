import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/app/lib/supabase';

export async function GET() {
  try {
    const { data: categories, error: catError } = await supabaseAdmin
      .from('categories')
      .select('id, name')
      .order('name');

    const { data: documentTypes, error: typeError } = await supabaseAdmin
      .from('document_types')
      .select('id, name, category_id')
      .order('name');

    if (catError || typeError) {
      return NextResponse.json({ error: 'Gagal mengambil data master.' }, { status: 500 });
    }

    return NextResponse.json({ categories, documentTypes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
