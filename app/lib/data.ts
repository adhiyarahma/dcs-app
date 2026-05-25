import { supabaseAdmin } from '@/app/lib/supabase';

// ============================================================
// USERS
// ============================================================
export async function getUsers() {
  const { data } = await supabaseAdmin
    .from('users')
    .select('id, name, email, role, created_at')
    .order('created_at', { ascending: false });
  return data ?? [];
}

// ============================================================
// CATEGORIES
// ============================================================
export async function getCategories() {
  const { data } = await supabaseAdmin
    .from('categories')
    .select('id, name, created_at, document_types(count)')
    .order('created_at');
  return (data ?? []).map((c: any) => ({
    ...c,
    type_count: c.document_types?.[0]?.count ?? 0,
  }));
}

// ============================================================
// DOCUMENT TYPES
// ============================================================
export async function getDocumentTypes() {
  const { data } = await supabaseAdmin
    .from('document_types')
    .select('id, name, created_at, category_id, categories!inner(name)')
    .order('name');
  return (data ?? []).map((dt: any) => ({
    ...dt,
    category_name: dt.categories?.name ?? '',
  }));
}

// ============================================================
// DEPARTMENTS
// ============================================================
export async function getDepartments() {
  const { data } = await supabaseAdmin
    .from('departments')
    .select('id, code, name')
    .order('code');
  return data ?? [];
}

// ============================================================
// DOCUMENTS
// ============================================================
async function attachFiles(documents: any[]) {
  return Promise.all(documents.map(async (doc) => {
    const { data: files } = await supabaseAdmin
      .from('document_files')
      .select('id, file_label, file_url, file_name, file_type')
      .eq('document_id', doc.id);
    return { ...doc, files: files ?? [] };
  }));
}

export async function getDocumentsByCategory(categoryId: string) {
  const { data } = await supabaseAdmin
    .from('documents')
    .select(`
      id, doc_number, title, revision, effective_date, revision_date,
      expiry_date, production_type, status, created_at, updated_at,
      category_id, type_id, department_id,
      document_types!inner(name),
      departments(code, name),
      users(name)
    `)
    .eq('category_id', categoryId)
    .in('status', ['terbaru', 'kadaluarsa'])
    .order('doc_number');

  const documents = (data ?? []).map((d: any) => ({
    ...d,
    type_name: d.document_types?.name ?? '',
    department_code: d.departments?.code ?? '',
    department_name: d.departments?.name ?? '',
    uploaded_by_name: d.users?.name ?? '',
  }));
  return attachFiles(documents);
}

export async function getDocumentHistory(docNumber: string) {
  const { data } = await supabaseAdmin
    .from('documents')
    .select(`
      id, doc_number, title, revision, effective_date, revision_date,
      expiry_date, status, created_at, updated_at, category_id, type_id,
      document_types!inner(name),
      departments(code),
      users(name)
    `)
    .eq('doc_number', docNumber)
    .neq('status', 'dihapus')
    .order('revision', { ascending: false });

  const documents = (data ?? []).map((d: any) => ({
    ...d,
    type_name: d.document_types?.name ?? '',
    department_code: d.departments?.code ?? '',
    uploaded_by_name: d.users?.name ?? '',
  }));
  return attachFiles(documents);
}

export async function getTrashedDocuments() {
  const { data } = await supabaseAdmin
    .from('documents')
    .select(`
      id, doc_number, title, revision, effective_date, status, updated_at, category_id,
      categories!inner(name),
      document_types!inner(name),
      departments(code),
      users(name)
    `)
    .eq('status', 'dihapus')
    .order('updated_at', { ascending: false });

  const documents = (data ?? []).map((d: any) => ({
    ...d,
    category_name: d.categories?.name ?? '',
    type_name: d.document_types?.name ?? '',
    department_code: d.departments?.code ?? '',
    uploaded_by_name: d.users?.name ?? '',
  }));
  return attachFiles(documents);
}

export async function getDocumentById(id: string) {
  const { data: doc } = await supabaseAdmin
    .from('documents')
    .select(`
      id, doc_number, title, revision, status,
      category_id, type_id, department_id,
      effective_date, revision_date, expiry_date, production_type,
      parent_id, uploaded_by,
      document_types!inner(name),
      categories!inner(name),
      departments(code, name)
    `)
    .eq('id', id)
    .single();

  if (!doc) return null;

  const { data: files } = await supabaseAdmin
    .from('document_files')
    .select('id, file_label, file_url, file_name, file_type')
    .eq('document_id', id);

  return {
    ...doc,
    type_name: (doc as any).document_types?.name ?? '',
    category_name: (doc as any).categories?.name ?? '',
    department_code: (doc as any).departments?.code ?? '',
    department_name: (doc as any).departments?.name ?? '',
    files: files ?? [],
  };
}

export async function fetchDeletedDocuments() {
  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .select(`
        id,
        doc_number,
        title,
        revision,
        updated_at,
        users ( name )
      `)
      .eq('status', 'dihapus')
      .order('updated_at', { ascending: false });

    if (error) throw new Error('Gagal mengambil data trash.');
    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Gagal mengambil data trash.');
  }
}
