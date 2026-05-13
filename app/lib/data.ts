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
