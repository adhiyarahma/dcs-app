import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

export async function getUsers() {
  const users = await sql`
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY created_at DESC
  `;
  return users;
}

export async function getUserById(id: string) {
  const user = await sql`
    SELECT id, name, email, role, created_at
    FROM users
    WHERE id = ${id}
  `;
  return user[0];
}
