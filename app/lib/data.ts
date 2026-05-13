import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// ============================================================
// USERS
// ============================================================
export async function getUsers() {
  const users = await sql`
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  return users;
}

// ============================================================
// CATEGORIES
// ============================================================
export async function getCategories() {
  const categories = await sql`
    SELECT c.id, c.name, c.created_at,
      COUNT(dt.id)::int AS type_count
    FROM categories c
    LEFT JOIN document_types dt ON dt.category_id = c.id
    GROUP BY c.id
    ORDER BY c.created_at ASC
  `;
  return categories;
}

// ============================================================
// DOCUMENT TYPES
// ============================================================
export async function getDocumentTypes() {
  const types = await sql`
    SELECT dt.id, dt.name, dt.created_at,
      dt.category_id, c.name AS category_name
    FROM document_types dt
    JOIN categories c ON c.id = dt.category_id
    ORDER BY c.name ASC, dt.name ASC
  `;
  return types;
}

// ============================================================
// DEPARTMENTS
// ============================================================
export async function getDepartments() {
  const departments = await sql`
    SELECT id, code, name
    FROM departments
    ORDER BY code ASC
  `;
  return departments;
}

// ============================================================
// DOCUMENTS
// ============================================================
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
      AND d.status != 'dihapus'
    ORDER BY d.doc_number ASC, d.revision DESC
  `;

  // Fetch files untuk setiap dokumen
  const documentsWithFiles = await Promise.all(
    documents.map(async (doc) => {
      const files = await sql`
        SELECT id, file_label, file_url, file_name, file_type
        FROM document_files
        WHERE document_id = ${doc.id as string}
      `;
      return { ...doc, files };
    })
  );

  return documentsWithFiles;
}

export async function getDocumentById(id: string) {
  const doc = await sql`
    SELECT d.id, d.doc_number, d.title, d.revision, d.status, d.category_id, d.type_id, d.department_id,
      TO_CHAR(d.effective_date, 'YYYY-MM-DD') AS effective_date,
      TO_CHAR(d.revision_date, 'YYYY-MM-DD') AS revision_date,
      TO_CHAR(d.expiry_date, 'YYYY-MM-DD') AS expiry_date,
      dt.name AS type_name,
      dep.code AS department_code,
      dep.name AS department_name
    FROM documents d
    JOIN document_types dt ON dt.id = d.type_id
    LEFT JOIN departments dep ON dep.id = d.department_id
    WHERE d.id = ${id}
  `;

  if (!doc[0]) return null;

  const files = await sql`
    SELECT id, file_label, file_url, file_name, file_type
    FROM document_files
    WHERE document_id = ${id}
  `;

  return { ...doc[0], files };
}
