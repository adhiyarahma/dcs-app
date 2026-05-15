import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// ============================================================
// USERS
// ============================================================
export async function getUsers() {
  return sql`SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC`;
}

// ============================================================
// CATEGORIES
// ============================================================
export async function getCategories() {
  return sql`
    SELECT c.id, c.name, c.created_at,
      COUNT(dt.id)::int AS type_count
    FROM categories c
    LEFT JOIN document_types dt ON dt.category_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at ASC
  `;
}

// ============================================================
// DOCUMENT TYPES
// ============================================================
export async function getDocumentTypes() {
  return sql`
    SELECT dt.id, dt.name, dt.created_at,
      dt.category_id, c.name AS category_name
    FROM document_types dt
    JOIN categories c ON c.id = dt.category_id
    ORDER BY c.name ASC, dt.name ASC
  `;
}

// ============================================================
// DEPARTMENTS
// ============================================================
export async function getDepartments() {
  return sql`SELECT id, code, name FROM departments ORDER BY code ASC`;
}

// ============================================================
// DOCUMENTS — hanya revisi terbaru (bukan dihapus)
// ============================================================
async function attachFiles(documents: any[]) {
  return Promise.all(documents.map(async (doc) => {
    const files = await sql`
      SELECT id, file_label, file_url, file_name, file_type
      FROM document_files WHERE document_id = ${doc.id}
    `;
    return { ...doc, files };
  }));
}

export async function getDocumentsByCategory(categoryId: string) {
  const documents = await sql`
    SELECT
      d.id, d.doc_number, d.title, d.revision,
      d.effective_date, d.revision_date, d.expiry_date,
      d.status, d.created_at, d.updated_at,
      d.category_id, d.type_id, d.department_id,
      dt.name AS type_name,
      dep.code AS department_code,
      dep.name AS department_name,
      u.name AS uploaded_by_name
    FROM documents d
    JOIN document_types dt ON dt.id = d.type_id
    LEFT JOIN departments dep ON dep.id = d.department_id
    LEFT JOIN users u ON u.id = d.uploaded_by
    WHERE d.category_id = ${categoryId}
      AND d.status IN ('terbaru', 'kadaluarsa')
    ORDER BY d.doc_number ASC, d.revision DESC
  `;
  return attachFiles(documents);
}

// Riwayat semua revisi untuk 1 doc_number (kecuali dihapus)
export async function getDocumentHistory(docNumber: string) {
  const documents = await sql`
    SELECT
      d.id, d.doc_number, d.title, d.revision,
      d.effective_date, d.revision_date, d.expiry_date,
      d.status, d.created_at, d.updated_at,
      d.category_id, d.type_id,
      dt.name AS type_name,
      dep.code AS department_code,
      u.name AS uploaded_by_name
    FROM documents d
    JOIN document_types dt ON dt.id = d.type_id
    LEFT JOIN departments dep ON dep.id = d.department_id
    LEFT JOIN users u ON u.id = d.uploaded_by
    WHERE d.doc_number = ${docNumber}
      AND d.status != 'dihapus'
    ORDER BY d.revision DESC
  `;
  return attachFiles(documents);
}

// Dokumen yang dihapus (recycle bin)
export async function getTrashedDocuments() {
  const documents = await sql`
    SELECT
      d.id, d.doc_number, d.title, d.revision,
      d.effective_date, d.status, d.updated_at,
      d.category_id,
      c.name AS category_name,
      dt.name AS type_name,
      dep.code AS department_code,
      u.name AS uploaded_by_name
    FROM documents d
    JOIN categories c ON c.id = d.category_id
    JOIN document_types dt ON dt.id = d.type_id
    LEFT JOIN departments dep ON dep.id = d.department_id
    LEFT JOIN users u ON u.id = d.uploaded_by
    WHERE d.status = 'dihapus'
    ORDER BY d.updated_at DESC
  `;
  return attachFiles(documents);
}

export async function getDocumentById(id: string) {
  const doc = await sql`
    SELECT d.id, d.doc_number, d.title, d.revision, d.status,
      d.category_id, d.type_id, d.department_id,
      TO_CHAR(d.effective_date, 'YYYY-MM-DD') AS effective_date,
      TO_CHAR(d.revision_date, 'YYYY-MM-DD') AS revision_date,
      TO_CHAR(d.expiry_date, 'YYYY-MM-DD') AS expiry_date,
      dt.name AS type_name,
      c.name AS category_name,
      dep.code AS department_code,
      dep.name AS department_name
    FROM documents d
    JOIN document_types dt ON dt.id = d.type_id
    JOIN categories c ON c.id = d.category_id
    LEFT JOIN departments dep ON dep.id = d.department_id
    WHERE d.id = ${id}
  `;
  if (!doc[0]) return null;
  const files = await sql`
    SELECT id, file_label, file_url, file_name, file_type
    FROM document_files WHERE document_id = ${id}
  `;
  return { ...doc[0], files };
}
