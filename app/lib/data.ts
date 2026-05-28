import { supabaseAdmin } from "@/app/lib/supabase";

// ============================================================
// USERS
// ============================================================
export async function getUsers() {
  const { data } = await supabaseAdmin
    .from("users")
    .select("id, name, email, role, created_at")
    .order("created_at", { ascending: false });
  return data ?? [];
}

// ============================================================
// CATEGORIES
// ============================================================
export async function getCategories() {
  const { data } = await supabaseAdmin
    .from("categories")
    .select("id, name, created_at, document_types(count)")
    .order("created_at");
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
    .from("document_types")
    .select("id, name, created_at, category_id, categories!inner(name)")
    .order("name");
  return (data ?? []).map((dt: any) => ({
    ...dt,
    category_name: dt.categories?.name ?? "",
  }));
}

// ============================================================
// DEPARTMENTS
// ============================================================
export async function getDepartments() {
  const { data } = await supabaseAdmin
    .from("departments")
    .select(
      `
      id, 
      code, 
      name,
      department_heads(name, title) // Pastikan nama kolomnya benar: 'name' dan 'title'
    `
    )
    .order("code");

  return (data ?? []).map((d: any) => ({
    ...d,
    // Kita simpan hasil join sebagai array 'heads'
    heads: d.department_heads ?? [],
  }));
}

// ============================================================
// DOCUMENTS
// ============================================================
async function attachFiles(documents: any[]) {
  if (documents.length === 0) return [];

  const ids = documents.map((d) => d.id);
  const { data: files } = await supabaseAdmin
    .from("document_files")
    .select("id, file_label, file_url, file_name, file_type, document_id")
    .in("document_id", ids); // ← satu query untuk semua

  const fileMap = new Map<string, any[]>();
  (files ?? []).forEach((f) => {
    if (!fileMap.has(f.document_id)) fileMap.set(f.document_id, []);
    fileMap.get(f.document_id)!.push(f);
  });

  return documents.map((doc) => ({
    ...doc,
    files: fileMap.get(doc.id) ?? [],
  }));
}

export async function getDocumentsByCategory(categoryId: string) {
  const PAGE = 1000;
  let allData: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select(
        `
        id, doc_number, title, revision, effective_date, revision_date,
        expiry_date, production_type, status, created_at, updated_at,
        category_id, type_id, department_id,
        document_types!inner(name),
        departments(code, name),
        users(name)
      `
      )
      .eq("category_id", categoryId)
      .in("status", ["terbaru", "kadaluarsa"])
      .order("doc_number")
      .range(from, from + PAGE - 1);

    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < PAGE) break;
    from += PAGE;
  }

  const documents = allData.map((d: any) => ({
    ...d,
    type_name: d.document_types?.name ?? "",
    department_code: d.departments?.code ?? "",
    department_name: d.departments?.name ?? "",
    uploaded_by_name: d.users?.name ?? "",
  }));
  return attachFiles(documents);
}

export async function getDocumentHistory(docNumber: string) {
  const { data } = await supabaseAdmin
    .from("documents")
    .select(
      `
      id, doc_number, title, revision, effective_date, revision_date,
      expiry_date, status, created_at, updated_at, category_id, type_id,
      document_types!inner(name),
      departments(code),
      users(name)
    `
    )
    .eq("doc_number", docNumber)
    .neq("status", "dihapus")
    .order("revision", { ascending: false });

  const documents = (data ?? []).map((d: any) => ({
    ...d,
    type_name: d.document_types?.name ?? "",
    department_code: d.departments?.code ?? "",
    uploaded_by_name: d.users?.name ?? "",
  }));
  return attachFiles(documents);
}

export async function getTrashedDocuments() {
  const { data } = await supabaseAdmin
    .from("documents")
    .select(
      `
      id, doc_number, title, revision, effective_date, status, updated_at, category_id,
      categories!inner(name),
      document_types!inner(name),
      departments(code),
      users(name)
    `
    )
    .eq("status", "dihapus")
    .order("updated_at", { ascending: false });

  const documents = (data ?? []).map((d: any) => ({
    ...d,
    category_name: d.categories?.name ?? "",
    type_name: d.document_types?.name ?? "",
    department_code: d.departments?.code ?? "",
    uploaded_by_name: d.users?.name ?? "",
  }));
  return attachFiles(documents);
}

export async function getDocumentById(id: string) {
  const { data: doc } = await supabaseAdmin
    .from("documents")
    .select(
      `
      id, doc_number, title, revision, status,
      category_id, type_id, department_id,
      effective_date, revision_date, expiry_date, production_type,
      parent_id, uploaded_by,
      document_types!inner(name),
      categories!inner(name),
      departments(code, name)
    `
    )
    .eq("id", id)
    .single();

  if (!doc) return null;

  const { data: files } = await supabaseAdmin
    .from("document_files")
    .select("id, file_label, file_url, file_name, file_type")
    .eq("document_id", id);

  return {
    ...doc,
    type_name: (doc as any).document_types?.name ?? "",
    category_name: (doc as any).categories?.name ?? "",
    department_code: (doc as any).departments?.code ?? "",
    department_name: (doc as any).departments?.name ?? "",
    files: files ?? [],
  };
}

// Ganti fungsi fetchDeletedDocuments di data.ts
export async function fetchDeletedDocuments() {
  const PAGE = 1000;
  let allData: any[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .select(
        `
        id, doc_number, title, revision, updated_at, category_id, type_id,
        categories!inner(name),
        document_types!inner(name),
        departments(code),
        users(name)
      `
      )
      .eq("status", "dihapus")
      .order("updated_at", { ascending: false })
      .range(from, from + PAGE - 1);

    if (error) throw new Error("Gagal mengambil data trash.");
    if (!data || data.length === 0) break;
    allData = [...allData, ...data];
    if (data.length < PAGE) break;
    from += PAGE;
  }

  return allData.map((d: any) => ({
    id: d.id,
    doc_number: d.doc_number,
    title: d.title,
    revision: d.revision,
    updated_at: d.updated_at,
    category_id: d.category_id,
    type_id: d.type_id,
    category_name: d.categories?.name ?? "",
    type_name: d.document_types?.name ?? "",
    department_code: d.departments?.code ?? "",
    uploaded_by_name: d.users?.name ?? "",
  }));
}

// ============================================================
// DISTRIBUTIONS
// ============================================================

export async function getDistributions() {
  const { data } = await supabaseAdmin
    .from("distributions")
    .select(
      `
      id, form_number, distributed_date, notes, created_at,
      departments!distributions_handed_by_dept_id_fkey(
        id, code, name, department_heads(name, title)
      ),
      users(name),
      distribution_items(
        id, quantity,
        documents(id, doc_number, title, revision)
      ),
      distribution_recipients(
        id,
        departments(id, code, name, department_heads(name, title))
      )
    `
    )
    .order("created_at", { ascending: false });

  return (data ?? []).map((d: any) => ({
    id: d.id,
    form_number: d.form_number,
    distributed_date: d.distributed_date,
    notes: d.notes,
    created_at: d.created_at,
    handed_by_dept: d.departments
      ? {
          ...d.departments,
          heads: d.departments.department_heads,
        }
      : null,
    created_by_name: d.users?.name ?? "",
    items: (d.distribution_items ?? []).map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      document: item.documents ?? null,
    })),
    recipients: (d.distribution_recipients ?? []).map((r: any) => ({
      id: r.id,
      dept: r.departments ?? null,
    })),
  }));
}

export async function getDistributionById(id: string) {
  const { data } = await supabaseAdmin
    .from("distributions")
    .select(
      `
      id, form_number, distributed_date, handed_by_dept_id, notes, created_at,
      departments!distributions_handed_by_dept_id_fkey(
        id, code, name, 
        department_heads(name, title)
      ),
      users(name),
      distribution_items(
        id, quantity,
        documents(id, doc_number, title, revision)
      ),
      distribution_recipients(
        id, dept_id,
        departments(id, code, name, department_heads(name, title))
      )
    `
    )
    .eq("id", id)
    .single();

  if (!data) return null;

  return {
    id: data.id,
    form_number: data.form_number,
    distributed_date: data.distributed_date,
    handed_by_dept_id: data.handed_by_dept_id,
    notes: data.notes,
    created_at: data.created_at,
    handed_by_dept: (data as any).departments ?? null,
    created_by_name: (data as any).users?.name ?? "",
    items: ((data as any).distribution_items ?? []).map((item: any) => ({
      id: item.id,
      quantity: item.quantity,
      document: item.documents ?? null,
    })),
    recipients: ((data as any).distribution_recipients ?? []).map((r: any) => ({
      id: r.id,
      dept_id: r.dept_id,
      dept: r.departments ?? null,
    })),
  };
}

// Ambil semua dokumen status 'terbaru' untuk dropdown
export async function getActiveDocuments() {
  const { data } = await supabaseAdmin
    .from("documents")
    .select(
      `
      id, doc_number, title, revision,
      document_types(name),
      departments(code)
    `
    )
    .eq("status", "terbaru")
    .order("doc_number");

  return (data ?? []).map((d: any) => ({
    id: d.id,
    doc_number: d.doc_number,
    title: d.title,
    revision: d.revision,
    type_name: d.document_types?.name ?? "",
    dept_code: d.departments?.code ?? "",
  }));
}

export async function getNextFormNumber(): Promise<string> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yy = String(now.getFullYear()).slice(-2);
  const startOfMonth = `${now.getFullYear()}-${mm}-01`;
  const startOfNext =
    now.getMonth() === 11
      ? `${now.getFullYear() + 1}-01-01`
      : `${now.getFullYear()}-${String(now.getMonth() + 2).padStart(
          2,
          "0"
        )}-01`;

  const { count } = await supabaseAdmin
    .from("distributions")
    .select("*", { count: "exact", head: true })
    .gte("created_at", startOfMonth)
    .lt("created_at", startOfNext);

  const nextNum = String((count ?? 0) + 1).padStart(3, "0");
  return `${nextNum}/MRP/${mm}/${yy}`;
}
