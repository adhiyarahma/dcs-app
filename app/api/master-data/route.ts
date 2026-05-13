import { NextResponse } from 'next/server';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function GET() {
  try {
    const categories = await sql`SELECT id, name FROM categories ORDER BY name ASC`;
    const documentTypes = await sql`SELECT id, name, category_id FROM document_types ORDER BY name ASC`;
    return NextResponse.json({ categories, documentTypes });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
