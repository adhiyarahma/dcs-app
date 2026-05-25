'use server';

import bcrypt from 'bcryptjs';
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

const FIXED_FIELDS = ['no', 'title', 'doc_number', 'revision', 'effective_date', 'status'];

const EXTRA_FIELDS: Record<string, string[]> = {
  dokumen_qesh: ['department_id'],
  msds_kimia:   ['revision_date', 'expiry_date', 'production_type'],
  msds_benang:  ['expiry_date'],
};

const DOCUMENT_TYPE_KEY: Record<string, string> = {
  'Instruksi Kerja':   'dokumen_qesh',
  'Formulir':          'dokumen_qesh',
  'Spesifikasi':       'dokumen_qesh',
  'Prosedur':          'dokumen_qesh',
  'Panduan':           'dokumen_qesh',
  'Job Description':   'dokumen_qesh',
  'Job Qualification': 'dokumen_qesh',
  'Pedoman':           'dokumen_qesh',
  'MSDS Kimia':        'msds_kimia',
  'MSDS Benang':       'msds_benang',
};

const STATUS_MAP: Record<string, string> = {
  'terbaru':    'terbaru',
  'kadaluarsa': 'kadaluarsa',
  'dihapus':    'dihapus',
};


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
  const revision = parseInt(formData.get('revision') as string ?? '0');
  const effective_date = formData.get('effective_date') as string;
  const revision_date = (formData.get('revision_date') as string) || null;
  const expiry_date = (formData.get('expiry_date') as string) || null;
  const production_type = (formData.get('production_type') as string) || null; // ← TAMBAHAN
  const uploaded_by = formData.get('uploaded_by') as string;

  if (!doc_number || !title || !category_id || !type_id || !effective_date)
    return { error: 'Field wajib belum lengkap.' };

  try {
    const { data, error } = await supabaseAdmin
      .from('documents')
      .insert({
        doc_number, title, category_id, type_id, department_id,
        revision, effective_date, revision_date, expiry_date,
        production_type, // ← TAMBAHAN
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
  } catch { return { error: 'Gagal membuat dokumen.' }; }
}

export async function updateDocument(id: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const doc_number = (formData.get('doc_number') as string)?.trim();
  const type_id = formData.get('type_id') as string;
  const revision = parseInt(formData.get('revision') as string) || 0;
  const department_id = (formData.get('department_id') as string) || null;
  const effective_date = formData.get('effective_date') as string;
  const revision_date = (formData.get('revision_date') as string) || null;
  const expiry_date = (formData.get('expiry_date') as string) || null;
  const production_type = (formData.get('production_type') as string) || null; // ← TAMBAHAN

  try {
    const { error } = await supabaseAdmin
      .from('documents')
      .update({
        title, doc_number, type_id, revision, department_id,
        effective_date, revision_date, expiry_date,
        production_type, // ← TAMBAHAN
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);
    if (error) {
      if (error.code === '23505') return { error: 'Nomor dokumen dengan revisi ini sudah ada.' };
      return { error: 'Gagal mengupdate dokumen.' };
    }
    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch { return { error: 'Gagal mengupdate dokumen.' }; }
}

export async function permanentDeleteDocument(id: string) {
  try {
    // Hapus file lampiran dulu (foreign key)
    await supabaseAdmin
      .from('document_files')
      .delete()
      .eq('document_id', id);

    // Hapus dokumen secara permanen
    const { error } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);

    if (error) return { error: 'Gagal menghapus dokumen.' };
    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch {
    return { error: 'Gagal menghapus dokumen.' };
  }
}


export async function restoreDocument(id: string) {
  try {
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from('documents')
      .select('doc_number')
      .eq('id', id)
      .single();

    if (fetchError || !doc) return { error: 'Dokumen tidak ditemukan.' };

    const { data: allRevisions, error: historyError } = await supabaseAdmin
      .from('documents')
      .select('id, revision')
      .eq('doc_number', doc.doc_number)
      .order('revision', { ascending: false });

    if (historyError || !allRevisions || allRevisions.length === 0) {
      return { error: 'Gagal mengambil riwayat dokumen.' };
    }

    const highestRevisionId = allRevisions[0].id;
    const olderRevisionIds = allRevisions.slice(1).map(d => d.id);

    const { error: restoreLatestError } = await supabaseAdmin
      .from('documents')
      .update({ status: 'terbaru', updated_at: new Date().toISOString() })
      .eq('id', highestRevisionId);

    if (restoreLatestError) return { error: 'Gagal memulihkan dokumen terbaru.' };

    if (olderRevisionIds.length > 0) {
      const { error: restoreOldError } = await supabaseAdmin
        .from('documents')
        .update({ status: 'kadaluarsa', updated_at: new Date().toISOString() })
        .in('id', olderRevisionIds);

      if (restoreOldError) return { error: 'Gagal memulihkan riwayat dokumen lama.' };
    }

    revalidatePath('/dashboard/documents');
    revalidatePath('/dashboard/trash');
    return { success: true };
  } catch {
    return { error: 'Gagal memulihkan dokumen.' };
  }
}

export async function saveDocumentFile(documentId: string, fileLabel: string, fileUrl: string, fileName: string, fileType: string) {
  try {
    const { error } = await supabaseAdmin
      .from('document_files')
      .upsert(
        { document_id: documentId, file_label: fileLabel, file_url: fileUrl, file_name: fileName, file_type: fileType },
        { onConflict: 'document_id,file_label' }
      );
    if (error) return { error: 'Gagal menyimpan file.' };
    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch { return { error: 'Gagal menyimpan file.' }; }
}

export async function deleteDocumentFile(documentId: string, fileLabel: string) {
  try {
    const { error } = await supabaseAdmin
      .from('document_files')
      .delete()
      .eq('document_id', documentId)
      .eq('file_label', fileLabel);
    if (error) return { error: 'Gagal menghapus file.' };
    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch { return { error: 'Gagal menghapus file.' }; }
}

export async function correctDocument(id: string, formData: FormData) {
  const title = (formData.get('title') as string)?.trim();
  const type_id = formData.get('type_id') as string;
  const department_id = (formData.get('department_id') as string) || null;
  const effective_date = formData.get('effective_date') as string;
  const revision_date = (formData.get('revision_date') as string) || null;
  const expiry_date = (formData.get('expiry_date') as string) || null;
  const production_type = (formData.get('production_type') as string) || null; // ← TAMBAHAN
  const new_status = formData.get('status') as string;

  if (!title || !type_id || !effective_date)
    return { error: 'Field wajib belum lengkap.' };

  try {
    if (new_status === 'dihapus') {
      const { data: doc } = await supabaseAdmin
        .from('documents')
        .select('doc_number')
        .eq('id', id)
        .single();

      if (!doc) return { error: 'Dokumen tidak ditemukan.' };

      const { error } = await supabaseAdmin
        .from('documents')
        .update({ status: 'dihapus', updated_at: new Date().toISOString() })
        .eq('doc_number', doc.doc_number);

      if (error) return { error: 'Gagal mengubah status dokumen.' };

      revalidatePath('/dashboard/documents');
      return { success: true };
    }

    // Koreksi biasa
    const { error } = await supabaseAdmin
      .from('documents')
      .update({
        title,
        type_id,
        department_id,
        effective_date,
        revision_date,
        expiry_date,
        production_type, // ← TAMBAHAN
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (error) return { error: 'Gagal menyimpan koreksi dokumen.' };

    revalidatePath('/dashboard/documents');
    return { success: true };
  } catch {
    return { error: 'Gagal menyimpan koreksi dokumen.' };
  }
}

export async function reviseDocument(
  oldId: string,
  oldRevision: number,
  uploadedBy: string,
  formData: FormData,
) {
  const title = (formData.get('title') as string)?.trim();
  const doc_number = (formData.get('doc_number') as string)?.trim();
  const category_id = formData.get('category_id') as string;
  const type_id = formData.get('type_id') as string;
  const department_id = (formData.get('department_id') as string) || null;
  const effective_date = formData.get('effective_date') as string;
  const revision_date = (formData.get('revision_date') as string) || null;
  const expiry_date = (formData.get('expiry_date') as string) || null;
  const production_type = (formData.get('production_type') as string) || null; // ← TAMBAHAN

  if (!title || !type_id || !effective_date || !doc_number)
    return { error: 'Field wajib belum lengkap.' };

  const { data: oldDoc } = await supabaseAdmin
    .from('documents')
    .select('effective_date')
    .eq('id', oldId)
    .single();

  if (oldDoc && oldDoc.effective_date === effective_date)
    return { error: 'Tanggal efektif harus berbeda dari dokumen sebelumnya.' };

  const MAX_REVISION = 8;
  const newRevision = oldRevision >= MAX_REVISION ? 0 : oldRevision + 1;

  try {
    const { error: expireError } = await supabaseAdmin
      .from('documents')
      .update({ status: 'kadaluarsa', updated_at: new Date().toISOString() })
      .eq('id', oldId);

    if (expireError) return { error: 'Gagal memproses revisi (step 1).' };

    const { data, error: insertError } = await supabaseAdmin
      .from('documents')
      .insert({
        doc_number,
        title,
        category_id,
        type_id,
        department_id,
        revision: newRevision,
        effective_date,
        revision_date,
        expiry_date,
        production_type, // ← TAMBAHAN
        status: 'terbaru',
        parent_id: oldId,
        uploaded_by: uploadedBy,
      })
      .select('id')
      .single();

    if (insertError) {
      await supabaseAdmin
        .from('documents')
        .update({ status: 'terbaru', updated_at: new Date().toISOString() })
        .eq('id', oldId);

      if (insertError.code === '23505')
        return { error: 'Terjadi konflik: sudah ada dokumen dengan revisi ini.' };
      return { error: 'Gagal memproses revisi (step 2).' };
    }

    revalidatePath('/dashboard/documents');
    return { success: true, newId: data.id };
  } catch {
    return { error: 'Gagal memproses revisi dokumen.' };
  }
}

export type ImportRowError = {
  row: number;
  field: string;
  message: string;
};

export type ImportPreviewRow = {
  no: number;
  title: string;
  doc_number: string;
  revision: number;
  effective_date: string;
  status: string;
  department_id?: string;
  revision_date?: string;
  expiry_date?: string;
  production_type?: string;
  category_id: string;
  type_id: string;
  uploaded_by: string;
};

export type ParseExcelResult =
  | { success: true; rows: ImportPreviewRow[]; errors: ImportRowError[] }
  | { success: false; error: string };

// ============================================================
// HELPER: parse tanggal dari Excel (number atau string)
// ============================================================
function parseDate(value: unknown): string | null {
  if (!value) return null;

  // Excel serial date → JS Date
  if (typeof value === 'number') {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  // String format: DD/MM/YYYY, YYYY-MM-DD, dll
  if (typeof value === 'string') {
    const s = value.trim();
    // DD/MM/YYYY
    const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
    }
    // YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }

  return null;
}

// ============================================================
// PARSE EXCEL (dipanggil setelah client kirim data sebagai JSON)
// ============================================================
export async function parseImportData(
  rows: Record<string, unknown>[],
  docTypeName: string,
  categoryId: string,
  typeId: string,
  uploadedBy: string,
): Promise<ParseExcelResult> {
  try {
    const extraKey = DOCUMENT_TYPE_KEY[docTypeName] ?? '';
    const extraFields = EXTRA_FIELDS[extraKey] ?? [];
    const allFields = [...FIXED_FIELDS, ...extraFields];

    // Ambil data departemen untuk lookup code → id
    const { data: departments } = await supabaseAdmin
      .from('departments')
      .select('id, code, name');
    const deptMap = new Map<string, string>();
    (departments ?? []).forEach((d: { id: string; code: string; name: string }) => {
      deptMap.set(`${d.code} - ${d.name}`.toLowerCase(), d.id);
    });

    const validRows: ImportPreviewRow[] = [];
    const errors: ImportRowError[] = [];

    rows.forEach((raw, index) => {
      const rowNum = index + 4; // baris Excel (header di baris 2-3, data mulai baris 4)
      const rowErrors: ImportRowError[] = [];

      // ── Title ──
      const title = String(raw['Judul Dokumen'] ?? '').trim();
      if (!title) rowErrors.push({ row: rowNum, field: 'Judul Dokumen', message: 'Wajib diisi' });

      // ── No. Dokumen ──
      const doc_number = String(raw['No. Dokumen'] ?? '').trim();
      if (!doc_number) rowErrors.push({ row: rowNum, field: 'No. Dokumen', message: 'Wajib diisi' });

      // ── Revisi ──
      const revisionRaw = raw['Revisi ke-'];
      const revision = parseInt(String(revisionRaw ?? '0'));
      if (isNaN(revision) || revision < 0)
        rowErrors.push({ row: rowNum, field: 'Revisi ke-', message: 'Harus berupa angka ≥ 0' });

      // ── Tgl Efektif ──
      const effective_date = parseDate(raw['Tgl Efektif']);
      if (!effective_date)
        rowErrors.push({ row: rowNum, field: 'Tgl Efektif', message: 'Format tanggal tidak valid (DD/MM/YYYY)' });

      // ── Status ──
      const statusRaw = String(raw['Status'] ?? '').trim().toLowerCase();
      const status = STATUS_MAP[statusRaw];
      if (!status)
        rowErrors.push({ row: rowNum, field: 'Status', message: 'Pilih: Terbaru, Kadaluarsa, atau Dihapus' });

      // ── Department (QESH) ──
      let department_id: string | undefined;
      if (extraFields.includes('department_id')) {
        const deptRaw = String(raw['PIC (Bagian/Departement)'] ?? '').trim();
        if (!deptRaw) {
          rowErrors.push({ row: rowNum, field: 'PIC (Bagian/Departement)', message: 'Wajib diisi' });
        } else {
          department_id = deptMap.get(deptRaw.toLowerCase());
          if (!department_id)
            rowErrors.push({ row: rowNum, field: 'PIC (Bagian/Departement)', message: `Departemen "${deptRaw}" tidak ditemukan` });
        }
      }

      // ── Tgl Revisi (MSDS Kimia) ──
      let revision_date: string | undefined;
      if (extraFields.includes('revision_date')) {
        const parsed = parseDate(raw['Tgl Revisi']);
        if (raw['Tgl Revisi'] && !parsed)
          rowErrors.push({ row: rowNum, field: 'Tgl Revisi', message: 'Format tanggal tidak valid (DD/MM/YYYY)' });
        else if (!parsed)
          rowErrors.push({ row: rowNum, field: 'Tgl Revisi', message: 'Wajib diisi' });
        revision_date = parsed ?? undefined;
      }

      // ── Masa Berlaku (MSDS) ──
      let expiry_date: string | undefined;
      if (extraFields.includes('expiry_date')) {
        const parsed = parseDate(raw['Masa Berlaku']);
        if (raw['Masa Berlaku'] && !parsed)
          rowErrors.push({ row: rowNum, field: 'Masa Berlaku', message: 'Format tanggal tidak valid (DD/MM/YYYY)' });
        else if (!parsed)
          rowErrors.push({ row: rowNum, field: 'Masa Berlaku', message: 'Wajib diisi' });
        expiry_date = parsed ?? undefined;
      }

      // ── Production Type (MSDS Kimia) ──
      let production_type: string | undefined;
      if (extraFields.includes('production_type')) {
        const pt = String(raw['Production Type'] ?? '').trim();
        if (!pt)
          rowErrors.push({ row: rowNum, field: 'Production Type', message: 'Wajib diisi' });
        production_type = pt || undefined;
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push({
          no: index + 1,
          title,
          doc_number,
          revision: isNaN(revision) ? 0 : revision,
          effective_date: effective_date!,
          status: status!,
          department_id,
          revision_date,
          expiry_date,
          production_type,
          category_id: categoryId,
          type_id: typeId,
          uploaded_by: uploadedBy,
        });
      }
    });

    return { success: true, rows: validRows, errors };
  } catch (e) {
    return { success: false, error: 'Gagal memproses file Excel.' };
  }
}

// ============================================================
// IMPORT KE DATABASE
// ============================================================
export async function importDocuments(
  rows: ImportPreviewRow[],
): Promise<{ success: true; count: number } | { success: false; error: string }> {
  if (!rows.length) return { success: false, error: 'Tidak ada data untuk diimport.' };

  try {
    const insertData = rows.map((r) => ({
      doc_number:      r.doc_number,
      title:           r.title,
      category_id:     r.category_id,
      type_id:         r.type_id,
      department_id:   r.department_id ?? null,
      revision:        r.revision,
      effective_date:  r.effective_date,
      revision_date:   r.revision_date ?? null,
      expiry_date:     r.expiry_date ?? null,
      production_type: r.production_type ?? null,
      status:          r.status,
      uploaded_by:     r.uploaded_by,
    }));

    const { error } = await supabaseAdmin.from('documents').insert(insertData);

    if (error) {
      if (error.code === '23505')
        return { success: false, error: 'Beberapa dokumen sudah ada (nomor dokumen & revisi duplikat).' };
      return { success: false, error: 'Gagal menyimpan data ke database.' };
    }

    revalidatePath('/dashboard/documents');
    return { success: true, count: rows.length };
  } catch {
    return { success: false, error: 'Gagal mengimport dokumen.' };
  }
}

// ============================================================
// GENERATE TEMPLATE (dipanggil dari API route)
// ============================================================
export async function getTemplateColumns(docTypeName: string) {
  const extraKey = DOCUMENT_TYPE_KEY[docTypeName] ?? '';
  const extraFields = EXTRA_FIELDS[extraKey] ?? [];
  return { fixedFields: FIXED_FIELDS, extraFields };
}

