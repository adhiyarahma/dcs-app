'use server';

import bcrypt from 'bcrypt';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { supabaseAdmin } from '@/app/lib/supabase';

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
    const { error } = await supabaseAdmin
      .from('users')
      .insert({ name, email, password: hashedPassword, role });
    if (error) {
      if (error.code === '23505') return { error: 'Email sudah terdaftar.' };
      return { error: 'Gagal membuat user.' };
    }
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch {
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
    const { error } = await supabaseAdmin
      .from('users')
      .update({ name, email, role })
      .eq('id', id);
    if (error) {
      if (error.code === '23505') return { error: 'Email sudah terdaftar.' };
      return { error: 'Gagal mengupdate user.' };
    }
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch {
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
    const { error } = await supabaseAdmin
      .from('users')
      .update({ password: hashedPassword })
      .eq('id', id);
    if (error) return { error: 'Gagal mereset password.' };
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch {
    return { error: 'Gagal mereset password.' };
  }
}

export async function deleteUser(id: string) {
  try {
    const { error } = await supabaseAdmin.from('users').delete().eq('id', id);
    if (error) return { error: 'Gagal menghapus user.' };
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
    const { error } = await supabaseAdmin.from('categories').insert({ name });
    if (error) {
      if (error.code === '23505') return { error: 'Kategori sudah ada.' };
      return { error: 'Gagal membuat kategori.' };
    }
    revalidatePath('/dashboard/master/categories');
    return { success: true };
  } catch {
    return { error: 'Gagal membuat kategori.' };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  if (!name) return { error: 'Nama kategori wajib diisi.' };
  try {
    const { error } = await supabaseAdmin
      .from('categories')
      .update({ name })
      .eq('id', id);
    if (error) {
      if (error.code === '23505') return { error: 'Kategori sudah ada.' };
      return { error: 'Gagal mengupdate kategori.' };
    }
    revalidatePath('/dashboard/master/categories');
    return { success: true };
  } catch {
    return { error: 'Gagal mengupdate kategori.' };
  }
}

export async function deleteCategory(id: string) {
  try {
    const { error } = await supabaseAdmin.from('categories').delete().eq('id', id);
    if (error) return { error: 'Gagal menghapus kategori. Pastikan tidak ada jenis dokumen yang menggunakan kategori ini.' };
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
    const { error } = await supabaseAdmin
      .from('document_types')
      .insert({ name, category_id });
    if (error) {
      if (error.code === '23505') return { error: 'Jenis dokumen sudah ada di kategori ini.' };
      return { error: 'Gagal membuat jenis dokumen.' };
    }
    revalidatePath('/dashboard/master/document-types');
    return { success: true };
  } catch {
    return { error: 'Gagal membuat jenis dokumen.' };
  }
}

export async function updateDocumentType(id: string, formData: FormData) {
  const name = (formData.get('name') as string)?.trim();
  const category_id = formData.get('category_id') as string;
  if (!name) return { error: 'Nama jenis dokumen wajib diisi.' };
  if (!category_id) return { error: 'Kategori wajib dipilih.' };
  try {
    const { error } = await supabaseAdmin
      .from('document_types')
      .update({ name, category_id })
      .eq('id', id);
    if (error) {
      if (error.code === '23505') return { error: 'Jenis dokumen sudah ada di kategori ini.' };
      return { error: 'Gagal mengupdate jenis dokumen.' };
    }
    revalidatePath('/dashboard/master/document-types');
    return { success: true };
  } catch {
    return { error: 'Gagal mengupdate jenis dokumen.' };
  }
}

export async function deleteDocumentType(id: string) {
  try {
    const { error } = await supabaseAdmin.from('document_types').delete().eq('id', id);
    if (error) return { error: 'Gagal menghapus jenis dokumen. Pastikan tidak ada dokumen yang menggunakan jenis ini.' };
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
    const { error } = await supabaseAdmin.from('departments').insert({ code, name });
    if (error) {
      if (error.code === '23505') return { error: 'Kode departemen sudah ada.' };
      return { error: 'Gagal membuat departemen.' };
    }
    revalidatePath('/dashboard/master/departments');
    return { success: true };
  } catch {
    return { error: 'Gagal membuat departemen.' };
  }
}

export async function updateDepartment(id: string, formData: FormData) {
  const code = (formData.get('code') as string)?.trim().toUpperCase();
  const name = (formData.get('name') as string)?.trim();
  if (!code) return { error: 'Kode departemen wajib diisi.' };
  if (!name) return { error: 'Nama departemen wajib diisi.' };
  try {
    const { error } = await supabaseAdmin
      .from('departments')
      .update({ code, name })
      .eq('id', id);
    if (error) {
      if (error.code === '23505') return { error: 'Kode departemen sudah ada.' };
      return { error: 'Gagal mengupdate departemen.' };
    }
    revalidatePath('/dashboard/master/departments');
    return { success: true };
  } catch {
    return { error: 'Gagal mengupdate departemen.' };
  }
}

export async function deleteDepartment(id: string) {
  try {
    const { error } = await supabaseAdmin.from('departments').delete().eq('id', id);
    if (error) return { error: 'Gagal menghapus departemen.' };
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
  const department_id = (formData.get('department_id') as string) || null;
  const revision = parseInt(formData.get('revision') as string) || 1;
  const effective_date = formData.get('effective_date') as string;
  const revision_date = (formData.get('revision_date') as string) || null;
  const expiry_date = (formData.get('expiry_date') as string) || null;
  const uploaded_by = formData.get('uploaded_by') as string;

  if (!doc_number || !title || !category_id || !type_id || !effective_date) {
    return { error: 'Field wajib belum lengkap.' };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        doc_number, title, category_id, type_id, department_id,
        revision, effective_date, revision_date, expiry_date,
        uploaded_by, status: 'terbaru',
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') return { error: 'Nomor dokumen dengan revisi ini sudah ada.' };
      return { error: 'Gagal membuat dokumen.' };
    }
    revalidatePath('/dashboard/documents');
    return { success: true, id: data.id };
  } catch {
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
    const { error } = await supabaseAdmin
      .from('document_files')
      .upsert(
        { document_id: documentId, file_label: fileLabel, file_url: fileUrl, file_name: fileName, file_type: fileType },
        { onConflict: 'document_id,file_label' }
      );
    if (error) return { error: 'Gagal menyimpan file.' };
    return { success: true };
  } catch {
    return { error: 'Gagal menyimpan file.' };
  }
}

export async function deleteDocument(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from('documents')
      .update({ status: 'dihapus', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (error) return { error: 'Gagal menghapus dokumen.' };
    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus dokumen.' };
  }
}

export async function updateDocumentOnly(id: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const doc_number = (formData.get('doc_number') as string)?.trim();
  const revision = parseInt(formData.get('revision') as string) || 0;
  const department_id = (formData.get('department_id') as string) || null;
  const effective_date = formData.get('effective_date') as string;
  const revision_date = (formData.get('revision_date') as string) || null;
  const expiry_date = (formData.get('expiry_date') as string) || null;

  try {
    const { error } = await supabaseAdmin
      .from('documents')
      .update({
        title, doc_number, revision, department_id,
        effective_date, revision_date, expiry_date,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      if (error.code === '23505') return { error: 'Nomor dokumen dengan revisi ini sudah ada.' };
      return { error: 'Gagal mengupdate dokumen.' };
    }
    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch {
    return { error: 'Gagal mengupdate dokumen.' };
  }
}

export async function createDocumentRevision(oldId: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const doc_number = (formData.get('doc_number') as string)?.trim();
  const category_id = formData.get('category_id') as string;
  const type_id = formData.get('type_id') as string;
  const revision = parseInt(formData.get('revision') as string) || 0;
  const department_id = (formData.get('department_id') as string) || null;
  const effective_date = formData.get('effective_date') as string;
  const revision_date = (formData.get('revision_date') as string) || null;
  const expiry_date = (formData.get('expiry_date') as string) || null;
  const uploaded_by = formData.get('uploaded_by') as string;

  try {
    // Tandai semua revisi lama sebagai kadaluarsa
    const { error: expireError } = await supabaseAdmin
      .from('documents')
      .update({ status: 'kadaluarsa', updated_at: new Date().toISOString() })
      .eq('doc_number', doc_number)
      .eq('status', 'terbaru');
    if (expireError) return { error: 'Gagal membuat revisi dokumen.' };

    // Insert revisi baru
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        doc_number, title, category_id, type_id, department_id,
        revision, effective_date, revision_date, expiry_date,
        uploaded_by, status: 'terbaru',
      })
      .select('id')
      .single();

    if (error) {
      if (error.code === '23505') return { error: 'Nomor dokumen dengan revisi ini sudah ada.' };
      return { error: 'Gagal membuat revisi dokumen.' };
    }
    revalidatePath('/dashboard/documents');
    return { success: true, id: data.id };
  } catch {
    return { error: 'Gagal membuat revisi dokumen.' };
  }
}

export async function restoreDocument(id: string) {
  try {
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('doc_number')
      .eq('id', id)
      .single();
    if (fetchError || !doc) return { error: 'Gagal memulihkan dokumen.' };

    const { data: existing } = await supabaseAdmin
      .from('documents')
      .select('id')
      .eq('doc_number', doc.doc_number)
      .eq('status', 'terbaru');

    const newStatus = !existing || existing.length === 0 ? 'terbaru' : 'kadaluarsa';
    const { error } = await supabaseAdmin
      .from('documents')
      .update({ status: newStatus, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) return { error: 'Gagal memulihkan dokumen.' };
    revalidatePath('/dashboard/documents');
    revalidatePath('/dashboard/documents/trash');
    return { success: true };
  } catch {
    return { error: 'Gagal memulihkan dokumen.' };
  }
}

export async function deleteDocumentFile(fileId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('document_files')
      .delete()
      .eq('id', fileId);
    if (error) return { error: 'Gagal menghapus file.' };
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus file.' };
  }
}
