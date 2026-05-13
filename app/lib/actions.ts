'use server';

import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

// ============================================================
// USERS
// ============================================================
const UserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(6, 'Password minimal 6 karakter'),
  role: z.enum(['admin', 'viewer']),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  email: z.string().email('Email tidak valid'),
  role: z.enum(['admin', 'viewer']),
});

const ResetPasswordSchema = z.object({
  password: z.string().min(6, 'Password minimal 6 karakter'),
  confirmPassword: z.string().min(6, 'Konfirmasi password wajib diisi'),
});

export async function createUser(formData: FormData) {
  const parsed = UserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { name, email, password, role } = parsed.data;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await sql`INSERT INTO users (name, email, password, role) VALUES (${name}, ${email}, ${hashedPassword}, ${role})`;
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Email sudah terdaftar.' };
    return { error: 'Gagal membuat user.' };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const parsed = UpdateUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { name, email, role } = parsed.data;
  try {
    await sql`UPDATE users SET name = ${name}, email = ${email}, role = ${role} WHERE id = ${id}`;
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Email sudah terdaftar.' };
    return { error: 'Gagal mengupdate user.' };
  }
}

export async function resetPassword(id: string, formData: FormData) {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { password, confirmPassword } = parsed.data;
  if (password !== confirmPassword) return { error: 'Password tidak cocok.' };
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${id}`;
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch {
    return { error: 'Gagal mereset password.' };
  }
}

export async function deleteUser(id: string) {
  try {
    await sql`DELETE FROM users WHERE id = ${id}`;
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus user.' };
  }
}

// ============================================================
// CATEGORIES
// ============================================================
export async function createCategory(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Nama kategori wajib diisi.' };
  try {
    await sql`INSERT INTO categories (name) VALUES (${name})`;
    revalidatePath('/dashboard/master/categories');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Kategori sudah ada.' };
    return { error: 'Gagal membuat kategori.' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Nama kategori wajib diisi.' };
  try {
    await sql`UPDATE categories SET name = ${name} WHERE id = ${id}`;
    revalidatePath('/dashboard/master/categories');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Kategori sudah ada.' };
    return { error: 'Gagal mengupdate kategori.' };
  }
}

export async function deleteCategory(id: string) {
  try {
    await sql`DELETE FROM categories WHERE id = ${id}`;
    revalidatePath('/dashboard/master/categories');
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus kategori. Pastikan tidak ada jenis dokumen yang menggunakan kategori ini.' };
  }
}

// ============================================================
// DOCUMENT TYPES
// ============================================================
export async function createDocumentType(formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const category_id = formData.get('category_id') as string;
  if (!name) return { error: 'Nama jenis dokumen wajib diisi.' };
  if (!category_id) return { error: 'Kategori wajib dipilih.' };
  try {
    await sql`INSERT INTO document_types (name, category_id) VALUES (${name}, ${category_id})`;
    revalidatePath('/dashboard/master/document-types');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Jenis dokumen sudah ada di kategori ini.' };
    return { error: 'Gagal membuat jenis dokumen.' };
  }
}

export async function updateDocumentType(id: string, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const category_id = formData.get('category_id') as string;
  if (!name) return { error: 'Nama jenis dokumen wajib diisi.' };
  if (!category_id) return { error: 'Kategori wajib dipilih.' };
  try {
    await sql`UPDATE document_types SET name = ${name}, category_id = ${category_id} WHERE id = ${id}`;
    revalidatePath('/dashboard/master/document-types');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Jenis dokumen sudah ada di kategori ini.' };
    return { error: 'Gagal mengupdate jenis dokumen.' };
  }
}

export async function deleteDocumentType(id: string) {
  try {
    await sql`DELETE FROM document_types WHERE id = ${id}`;
    revalidatePath('/dashboard/master/document-types');
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus jenis dokumen. Pastikan tidak ada dokumen yang menggunakan jenis ini.' };
  }
}

// ============================================================
// DEPARTMENTS
// ============================================================
export async function createDepartment(formData: FormData) {
  const code = (formData.get('code') as string)?.trim().toUpperCase();
  const name = (formData.get('name') as string)?.trim();
  if (!code) return { error: 'Kode departemen wajib diisi.' };
  if (!name) return { error: 'Nama departemen wajib diisi.' };
  try {
    await sql`INSERT INTO departments (code, name) VALUES (${code}, ${name})`;
    revalidatePath('/dashboard/master/departments');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Kode departemen sudah ada.' };
    return { error: 'Gagal membuat departemen.' };
  }
}

export async function updateDepartment(id: string, formData: FormData) {
  const code = (formData.get('code') as string)?.trim().toUpperCase();
  const name = (formData.get('name') as string)?.trim();
  if (!code) return { error: 'Kode departemen wajib diisi.' };
  if (!name) return { error: 'Nama departemen wajib diisi.' };
  try {
    await sql`UPDATE departments SET code = ${code}, name = ${name} WHERE id = ${id}`;
    revalidatePath('/dashboard/master/departments');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Kode departemen sudah ada.' };
    return { error: 'Gagal mengupdate departemen.' };
  }
}

export async function deleteDepartment(id: string) {
  try {
    await sql`DELETE FROM departments WHERE id = ${id}`;
    revalidatePath('/dashboard/master/departments');
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus departemen.' };
  }
}

// ============================================================
// DOCUMENTS
// ============================================================
export async function createDocument(formData: FormData) {
  const doc_number = (formData.get('doc_number') as string)?.trim();
  const title = (formData.get('title') as string)?.trim();
  const category_id = formData.get('category_id') as string;
  const type_id = formData.get('type_id') as string;
  const department_id = formData.get('department_id') as string || null;
  const revision = parseInt(formData.get('revision') as string) || 1;
  const effective_date = formData.get('effective_date') as string;
  const revision_date = formData.get('revision_date') as string || null;
  const expiry_date = formData.get('expiry_date') as string || null;
  const uploaded_by = formData.get('uploaded_by') as string;

  if (!doc_number || !title || !category_id || !type_id || !effective_date) {
    return { error: 'Field wajib belum lengkap.' };
  }

  try {
    const result = await sql`
      INSERT INTO documents 
        (doc_number, title, category_id, type_id, department_id, revision, 
         effective_date, revision_date, expiry_date, uploaded_by, status)
      VALUES 
        (${doc_number}, ${title}, ${category_id}, ${type_id}, ${department_id}, 
         ${revision}, ${effective_date}, ${revision_date}, ${expiry_date}, 
         ${uploaded_by}, 'terbaru')
      RETURNING id
    `;
    revalidatePath('/dashboard/documents');
    return { success: true, id: result[0].id };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Nomor dokumen dengan revisi ini sudah ada.' };
    return { error: 'Gagal membuat dokumen.' };
  }
}

export async function saveDocumentFile(
  documentId: string,
  fileLabel: string,
  fileUrl: string,
  fileName: string,
  fileType: string
) {
  try {
    await sql`
      INSERT INTO document_files (document_id, file_label, file_url, file_name, file_type)
      VALUES (${documentId}, ${fileLabel}, ${fileUrl}, ${fileName}, ${fileType})
      ON CONFLICT DO NOTHING
    `;
    return { success: true };
  } catch {
    return { error: 'Gagal menyimpan file.' };
  }
}

export async function deleteDocument(id: string) {
  try {
    await sql`UPDATE documents SET status = 'dihapus', updated_at = NOW() WHERE id = ${id}`;
    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus dokumen.' };
  }
}

// ============================================================
// UPDATE DOCUMENT
// ============================================================
export async function updateDocument(id: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const doc_number = (formData.get('doc_number') as string)?.trim();
  const revision = parseInt(formData.get('revision') as string) || 1;
  const department_id = formData.get('department_id') as string || null;
  const effective_date = formData.get('effective_date') as string;
  const revision_date = formData.get('revision_date') as string || null;
  const expiry_date = formData.get('expiry_date') as string || null;

  if (!title || !doc_number || !effective_date) {
    return { error: 'Field wajib belum lengkap.' };
  }

  try {
    await sql`
      UPDATE documents SET
        title = ${title},
        doc_number = ${doc_number},
        revision = ${revision},
        department_id = ${department_id},
        effective_date = ${effective_date},
        revision_date = ${revision_date},
        expiry_date = ${expiry_date},
        updated_at = NOW()
      WHERE id = ${id}
    `;
    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') return { error: 'Nomor dokumen dengan revisi ini sudah ada.' };
    return { error: 'Gagal mengupdate dokumen.' };
  }
}

export async function deleteDocumentFile(fileId: string) {
  try {
    await sql`DELETE FROM document_files WHERE id = ${fileId}`;
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus file.' };
  }
}
