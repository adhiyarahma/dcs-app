"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "@/app/lib/supabase";

// ============================================================
// CONSTANTS
// ============================================================
const FIXED_FIELDS = [
  "no",
  "title",
  "doc_number",
  "revision",
  "effective_date",
  "status",
];

const EXTRA_FIELDS: Record<string, string[]> = {
  dokumen_qesh: ["department_id"],
  msds_kimia: ["revision_date", "expiry_date", "production_type"],
  msds_benang: ["expiry_date"],
};

const DOCUMENT_TYPE_KEY: Record<string, string> = {
  "Instruksi Kerja": "dokumen_qesh",
  Formulir: "dokumen_qesh",
  Spesifikasi: "dokumen_qesh",
  Prosedur: "dokumen_qesh",
  Panduan: "dokumen_qesh",
  "Job Description": "dokumen_qesh",
  "Job Qualification": "dokumen_qesh",
  Pedoman: "dokumen_qesh",
  "MSDS Kimia": "msds_kimia",
  "MSDS Benang": "msds_benang",
};

const STATUS_MAP: Record<string, string> = {
  terbaru: "terbaru",
  kadaluarsa: "kadaluarsa",
  dihapus: "dihapus",
};

const PRODUCTION_TYPE_NORMALIZE: Record<string, string> = {
  production: "production",
  Production: "production",
  "non-production": "non-production",
  "Non-Production": "non-production",
  "prod. bahan baku": "production bahan baku",
  "Prod. Bahan Baku": "production bahan baku",
  "production bahan baku": "production bahan baku",
};

function normalizeProductionType(
  val: string | null | undefined
): string | null {
  if (!val || !val.trim()) return null;
  return PRODUCTION_TYPE_NORMALIZE[val.trim()] ?? val.trim().toLowerCase();
}

// ============================================================
// SCHEMAS
// ============================================================
const UserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  password: z.string().min(6, "Password minimal 6 karakter"),
  role: z.enum(["admin", "viewer"]),
});

const UpdateUserSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  role: z.enum(["admin", "viewer"]),
});

const ResetPasswordSchema = z.object({
  password: z.string().min(6, "Password minimal 6 karakter"),
  confirmPassword: z.string().min(6, "Konfirmasi password wajib diisi"),
});

// ============================================================
// USERS
// ============================================================
export async function createUser(formData: FormData) {
  const parsed = UserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { name, email, password, role } = parsed.data;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { error } = await supabaseAdmin
      .from("users")
      .insert({ name, email, password: hashedPassword, role });
    if (error) {
      if (error.code === "23505") return { error: "Email sudah terdaftar." };
      return { error: "Gagal membuat user." };
    }
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch {
    return { error: "Gagal membuat user." };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const parsed = UpdateUserSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { name, email, role } = parsed.data;
  try {
    const { error } = await supabaseAdmin
      .from("users")
      .update({ name, email, role })
      .eq("id", id);
    if (error) {
      if (error.code === "23505") return { error: "Email sudah terdaftar." };
      return { error: "Gagal mengupdate user." };
    }
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch {
    return { error: "Gagal mengupdate user." };
  }
}

export async function resetPassword(id: string, formData: FormData) {
  const parsed = ResetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { password, confirmPassword } = parsed.data;
  if (password !== confirmPassword) return { error: "Password tidak cocok." };
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const { error } = await supabaseAdmin
      .from("users")
      .update({ password: hashedPassword })
      .eq("id", id);
    if (error) return { error: "Gagal mereset password." };
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch {
    return { error: "Gagal mereset password." };
  }
}

export async function deleteUser(id: string) {
  try {
    const { error } = await supabaseAdmin.from("users").delete().eq("id", id);
    if (error) return { error: "Gagal menghapus user." };
    revalidatePath("/dashboard/users");
    return { success: true };
  } catch {
    return { error: "Gagal menghapus user." };
  }
}

// ============================================================
// CATEGORIES
// ============================================================
export async function createCategory(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nama kategori wajib diisi." };
  try {
    const { error } = await supabaseAdmin.from("categories").insert({ name });
    if (error) {
      if (error.code === "23505") return { error: "Kategori sudah ada." };
      return { error: "Gagal membuat kategori." };
    }
    revalidatePath("/dashboard/master/categories");
    return { success: true };
  } catch {
    return { error: "Gagal membuat kategori." };
  }
}

export async function updateCategory(id: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) return { error: "Nama kategori wajib diisi." };
  try {
    const { error } = await supabaseAdmin
      .from("categories")
      .update({ name })
      .eq("id", id);
    if (error) {
      if (error.code === "23505") return { error: "Kategori sudah ada." };
      return { error: "Gagal mengupdate kategori." };
    }
    revalidatePath("/dashboard/master/categories");
    return { success: true };
  } catch {
    return { error: "Gagal mengupdate kategori." };
  }
}

export async function deleteCategory(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from("categories")
      .delete()
      .eq("id", id);
    if (error)
      return {
        error:
          "Gagal menghapus kategori. Pastikan tidak ada jenis dokumen yang menggunakan kategori ini.",
      };
    revalidatePath("/dashboard/master/categories");
    return { success: true };
  } catch {
    return {
      error:
        "Gagal menghapus kategori. Pastikan tidak ada jenis dokumen yang menggunakan kategori ini.",
    };
  }
}

// ============================================================
// DOCUMENT TYPES
// ============================================================
export async function createDocumentType(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const category_id = formData.get("category_id") as string;
  if (!name) return { error: "Nama jenis dokumen wajib diisi." };
  if (!category_id) return { error: "Kategori wajib dipilih." };
  try {
    const { error } = await supabaseAdmin
      .from("document_types")
      .insert({ name, category_id });
    if (error) {
      if (error.code === "23505")
        return { error: "Jenis dokumen sudah ada di kategori ini." };
      return { error: "Gagal membuat jenis dokumen." };
    }
    revalidatePath("/dashboard/master/document-types");
    return { success: true };
  } catch {
    return { error: "Gagal membuat jenis dokumen." };
  }
}

export async function updateDocumentType(id: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const category_id = formData.get("category_id") as string;
  if (!name) return { error: "Nama jenis dokumen wajib diisi." };
  if (!category_id) return { error: "Kategori wajib dipilih." };
  try {
    const { error } = await supabaseAdmin
      .from("document_types")
      .update({ name, category_id })
      .eq("id", id);
    if (error) {
      if (error.code === "23505")
        return { error: "Jenis dokumen sudah ada di kategori ini." };
      return { error: "Gagal mengupdate jenis dokumen." };
    }
    revalidatePath("/dashboard/master/document-types");
    return { success: true };
  } catch {
    return { error: "Gagal mengupdate jenis dokumen." };
  }
}

export async function deleteDocumentType(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from("document_types")
      .delete()
      .eq("id", id);
    if (error)
      return {
        error:
          "Gagal menghapus jenis dokumen. Pastikan tidak ada dokumen yang menggunakan jenis ini.",
      };
    revalidatePath("/dashboard/master/document-types");
    return { success: true };
  } catch {
    return {
      error:
        "Gagal menghapus jenis dokumen. Pastikan tidak ada dokumen yang menggunakan jenis ini.",
    };
  }
}

// ============================================================
// DEPARTMENTS
// ============================================================
export async function createDepartment(formData: FormData) {
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const name = (formData.get("name") as string)?.trim();

  const keys = Array.from(formData.keys());
  const headIndices = keys
    .filter((k) => k.startsWith("head_name_"))
    .map((k) => k.split("_")[2]);

  const heads = headIndices
    .map((index) => ({
      name: formData.get(`head_name_${index}`) as string,
      title: formData.get(`head_title_${index}`) as string,
    }))
    .filter((h) => h.name && h.title);

  if (!code || !name) return { error: "Kode dan Nama departemen wajib diisi." };

  try {
    const { data: deptData, error: deptError } = await supabaseAdmin
      .from("departments")
      .insert({ code, name })
      .select("id")
      .single();

    if (deptError || !deptData) {
      console.error("Dept Error:", deptError);
      return { error: "Gagal membuat departemen." };
    }

    if (heads.length > 0) {
      const headsToInsert = heads.map((h: any) => ({
        department_id: deptData.id,
        name: h.name,
        title: h.title,
      }));

      const { error: headError } = await supabaseAdmin
        .from("department_heads")
        .insert(headsToInsert);

      if (headError) {
        console.error("Gagal insert heads:", headError);
        return {
          error: "Departemen terbuat, tapi gagal menyimpan kepala bagian.",
        };
      }
    }

    revalidatePath("/dashboard/master/departments");
    return { success: true };
  } catch (err) {
    return { error: "Terjadi kesalahan sistem." };
  }
}

export async function updateDepartment(id: string, formData: FormData) {
  const code = (formData.get("code") as string)?.trim().toUpperCase();
  const name = (formData.get("name") as string)?.trim();
  const headsRaw = formData.get("heads_json") as string;
  const heads = headsRaw ? JSON.parse(headsRaw) : [];

  if (!code || !name) return { error: "Kode dan Nama departemen wajib diisi." };

  try {
    const { error: deptError } = await supabaseAdmin
      .from("departments")
      .update({ code, name })
      .eq("id", id);

    if (deptError) throw new Error("Gagal update tabel utama.");

    const { error: deleteError } = await supabaseAdmin
      .from("department_heads")
      .delete()
      .eq("department_id", id);

    if (deleteError) throw new Error("Gagal menghapus data kepala lama.");

    if (heads.length > 0) {
      const headsToInsert = heads.map((h: any) => ({
        department_id: id,
        name: h.name,
        title: h.title,
      }));

      const { error: insertError } = await supabaseAdmin
        .from("department_heads")
        .insert(headsToInsert);

      if (insertError)
        throw new Error(
          `Gagal menyimpan kepala departemen: ${insertError.message}`
        );
    }

    revalidatePath("/dashboard/master/departments");
    return { success: true };
  } catch (err: any) {
    console.error("Update Error:", err);
    return { error: err.message || "Gagal mengupdate departemen." };
  }
}

export async function deleteDepartment(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from("departments")
      .delete()
      .eq("id", id);
    if (error) return { error: "Gagal menghapus departemen." };
    revalidatePath("/dashboard/master/departments");
    return { success: true };
  } catch {
    return { error: "Gagal menghapus departemen." };
  }
}

// ============================================================
// DOCUMENTS
// ============================================================
export async function createDocument(formData: FormData) {
  const doc_number = (formData.get("doc_number") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const category_id = formData.get("category_id") as string;
  const type_id = formData.get("type_id") as string;
  const department_id = (formData.get("department_id") as string) || null;
  const revision = parseInt((formData.get("revision") as string) ?? "0");
  const effective_date = formData.get("effective_date") as string;
  const revision_date = (formData.get("revision_date") as string) || null;
  const expiry_date = (formData.get("expiry_date") as string) || null;
  const production_type = normalizeProductionType(
    formData.get("production_type") as string
  );
  const uploaded_by = formData.get("uploaded_by") as string;

  if (!doc_number || !title || !category_id || !type_id || !effective_date)
    return { error: "Field wajib belum lengkap." };

  try {
    const { data, error } = await supabaseAdmin
      .from("documents")
      .insert({
        doc_number,
        title,
        category_id,
        type_id,
        department_id,
        revision,
        effective_date,
        revision_date,
        expiry_date,
        production_type,
        uploaded_by,
        status: "terbaru",
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505")
        return { error: "Nomor dokumen dengan revisi ini sudah ada." };
      return { error: "Gagal membuat dokumen." };
    }
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    return { success: true, id: data.id };
  } catch {
    return { error: "Gagal membuat dokumen." };
  }
}

export async function updateDocument(id: string, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const doc_number = (formData.get("doc_number") as string)?.trim();
  const type_id = formData.get("type_id") as string;
  const revision = parseInt(formData.get("revision") as string) || 0;
  const department_id = (formData.get("department_id") as string) || null;
  const effective_date = formData.get("effective_date") as string;
  const revision_date = (formData.get("revision_date") as string) || null;
  const expiry_date = (formData.get("expiry_date") as string) || null;
  const production_type = normalizeProductionType(
    formData.get("production_type") as string
  );

  try {
    const { error } = await supabaseAdmin
      .from("documents")
      .update({
        title,
        doc_number,
        type_id,
        revision,
        department_id,
        effective_date,
        revision_date,
        expiry_date,
        production_type,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      if (error.code === "23505")
        return { error: "Nomor dokumen dengan revisi ini sudah ada." };
      return { error: "Gagal mengupdate dokumen." };
    }
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    return { success: true };
  } catch {
    return { error: "Gagal mengupdate dokumen." };
  }
}

export async function permanentDeleteDocument(id: string) {
  try {
    await supabaseAdmin.from("document_files").delete().eq("document_id", id);
    const { error } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", id);
    if (error) return { error: "Gagal menghapus dokumen." };
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    return { success: true };
  } catch {
    return { error: "Gagal menghapus dokumen." };
  }
}

export async function restoreDocument(id: string) {
  try {
    const { data: doc, error: fetchError } = await supabaseAdmin
      .from("documents")
      .select("doc_number")
      .eq("id", id)
      .single();

    if (fetchError || !doc) return { error: "Dokumen tidak ditemukan." };

    const { data: allRevisions, error: historyError } = await supabaseAdmin
      .from("documents")
      .select("id, revision")
      .eq("doc_number", doc.doc_number)
      .order("revision", { ascending: false });

    if (historyError || !allRevisions || allRevisions.length === 0)
      return { error: "Gagal mengambil riwayat dokumen." };

    const highestRevisionId = allRevisions[0].id;
    const olderRevisionIds = allRevisions.slice(1).map((d) => d.id);

    const { error: restoreLatestError } = await supabaseAdmin
      .from("documents")
      .update({ status: "terbaru", updated_at: new Date().toISOString() })
      .eq("id", highestRevisionId);

    if (restoreLatestError)
      return { error: "Gagal memulihkan dokumen terbaru." };

    if (olderRevisionIds.length > 0) {
      const { error: restoreOldError } = await supabaseAdmin
        .from("documents")
        .update({ status: "kadaluarsa", updated_at: new Date().toISOString() })
        .in("id", olderRevisionIds);
      if (restoreOldError)
        return { error: "Gagal memulihkan riwayat dokumen lama." };
    }
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    revalidatePath("/dashboard/trash");
    return { success: true };
  } catch {
    return { error: "Gagal memulihkan dokumen." };
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
    const { error } = await supabaseAdmin.from("document_files").upsert(
      {
        document_id: documentId,
        file_label: fileLabel,
        file_url: fileUrl,
        file_name: fileName,
        file_type: fileType,
      },
      { onConflict: "document_id,file_label" }
    );
    if (error) return { error: "Gagal menyimpan file." };
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    return { success: true };
  } catch {
    return { error: "Gagal menyimpan file." };
  }
}

export async function deleteDocumentFile(
  documentId: string,
  fileLabel: string
) {
  try {
    const { error } = await supabaseAdmin
      .from("document_files")
      .delete()
      .eq("document_id", documentId)
      .eq("file_label", fileLabel);
    if (error) return { error: "Gagal menghapus file." };
    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    return { success: true };
  } catch {
    return { error: "Gagal menghapus file." };
  }
}

export async function correctDocument(id: string, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const type_id = formData.get("type_id") as string;
  const department_id = (formData.get("department_id") as string) || null;
  const effective_date = formData.get("effective_date") as string;
  const revision_date = (formData.get("revision_date") as string) || null;
  const expiry_date = (formData.get("expiry_date") as string) || null;
  const production_type = normalizeProductionType(
    formData.get("production_type") as string
  );
  const new_status = formData.get("status") as string;

  if (!title || !type_id || !effective_date)
    return { error: "Field wajib belum lengkap." };

  try {
    if (new_status === "dihapus") {
      const { data: doc } = await supabaseAdmin
        .from("documents")
        .select("doc_number")
        .eq("id", id)
        .single();

      if (!doc) return { error: "Dokumen tidak ditemukan." };

      const { error } = await supabaseAdmin
        .from("documents")
        .update({ status: "dihapus", updated_at: new Date().toISOString() })
        .eq("doc_number", doc.doc_number);

      if (error) return { error: "Gagal mengubah status dokumen." };

      revalidatePath("/dashboard/documents");
      revalidatePath("/dashboard/dokumen-qesh");
      revalidatePath("/dashboard/msds");
      revalidatePath("/dashboard/dokumen-eksternal");
      return { success: true };
    }

    const { error } = await supabaseAdmin
      .from("documents")
      .update({
        title,
        type_id,
        department_id,
        effective_date,
        revision_date,
        expiry_date,
        production_type,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (error) return { error: "Gagal menyimpan koreksi dokumen." };

    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    return { success: true };
  } catch {
    return { error: "Gagal menyimpan koreksi dokumen." };
  }
}

export async function reviseDocument(
  oldId: string,
  oldRevision: number,
  uploadedBy: string,
  formData: FormData
) {
  const title = (formData.get("title") as string)?.trim();
  const doc_number = (formData.get("doc_number") as string)?.trim();
  const category_id = formData.get("category_id") as string;
  const type_id = formData.get("type_id") as string;
  const department_id = (formData.get("department_id") as string) || null;
  const effective_date = formData.get("effective_date") as string;
  const revision_date = (formData.get("revision_date") as string) || null;
  const expiry_date = (formData.get("expiry_date") as string) || null;
  const production_type = normalizeProductionType(
    formData.get("production_type") as string
  );

  if (!title || !type_id || !effective_date || !doc_number)
    return { error: "Field wajib belum lengkap." };

  const { data: oldDoc } = await supabaseAdmin
    .from("documents")
    .select("effective_date")
    .eq("id", oldId)
    .single();

  if (oldDoc && oldDoc.effective_date === effective_date)
    return { error: "Tanggal efektif harus berbeda dari dokumen sebelumnya." };

  const MAX_REVISION = 8;
  const newRevision = oldRevision >= MAX_REVISION ? 0 : oldRevision + 1;

  try {
    const { error: expireError } = await supabaseAdmin
      .from("documents")
      .update({ status: "kadaluarsa", updated_at: new Date().toISOString() })
      .eq("id", oldId);

    if (expireError) return { error: "Gagal memproses revisi (step 1)." };

    const { data, error: insertError } = await supabaseAdmin
      .from("documents")
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
        production_type,
        status: "terbaru",
        parent_id: oldId,
        uploaded_by: uploadedBy,
      })
      .select("id")
      .single();

    if (insertError) {
      await supabaseAdmin
        .from("documents")
        .update({ status: "terbaru", updated_at: new Date().toISOString() })
        .eq("id", oldId);
      if (insertError.code === "23505")
        return {
          error: "Terjadi konflik: sudah ada dokumen dengan revisi ini.",
        };
      return { error: "Gagal memproses revisi (step 2)." };
    }

    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    return { success: true, newId: data.id };
  } catch {
    return { error: "Gagal memproses revisi dokumen." };
  }
}

// ============================================================
// IMPORT TYPES
// ============================================================
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
  effective_date?: string;
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
// HELPER: parse tanggal dari Excel
// ============================================================
function parseDate(value: unknown): string | null {
  if (!value) return null;

  if (typeof value === "number") {
    const date = new Date((value - 25569) * 86400 * 1000);
    return date.toISOString().split("T")[0];
  }

  if (typeof value === "string") {
    const s = value.trim();
    const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (dmyMatch) {
      const [, d, m, y] = dmyMatch;
      return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
    }
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  }

  return null;
}

// ============================================================
// PARSE EXCEL
// ============================================================
export async function parseImportData(
  rows: Record<string, unknown>[],
  docTypeName: string,
  categoryId: string,
  typeId: string,
  uploadedBy: string
): Promise<ParseExcelResult> {
  try {
    const extraKey = DOCUMENT_TYPE_KEY[docTypeName] ?? "";
    const extraFields = EXTRA_FIELDS[extraKey] ?? [];
    const isMsds = extraKey.startsWith("msds");
    const isMsdsKimia = extraKey === "msds_kimia";
    const isMsdsBenang = extraKey === "msds_benang";

    const { data: departments } = await supabaseAdmin
      .from("departments")
      .select("id, code, name");

    const deptMap = new Map<string, string>();
    (departments ?? []).forEach(
      (d: { id: string; code: string; name: string }) => {
        deptMap.set(`${d.code} - ${d.name}`.toLowerCase(), d.id);
        deptMap.set(d.code.toLowerCase(), d.id);
      }
    );

    const excelDocNumbers = rows
      .map((r) => String(r["No. Dokumen"] ?? "").trim())
      .filter(Boolean);

    let existingDocs: any[] = [];
    if (excelDocNumbers.length > 0) {
      const { data } = await supabaseAdmin
        .from("documents")
        .select("doc_number, title, revision, effective_date, status")
        .in("doc_number", excelDocNumbers);
      existingDocs = data ?? [];
    }

    const validRows: ImportPreviewRow[] = [];
    const errors: ImportRowError[] = [];
    const startRowOffset = isMsds ? 16 : 14;
    const excelDuplicateTracker = new Set<string>();

    rows.forEach((raw, index) => {
      const rowNum = index + startRowOffset;
      const rowErrors: ImportRowError[] = [];

      const titleRaw = String(raw["Judul Dokumen"] ?? "").trim();
      const docNumRaw = String(raw["No. Dokumen"] ?? "").trim();

      if (!titleRaw && !docNumRaw) return;

      const title = titleRaw;
      if (!title)
        rowErrors.push({
          row: rowNum,
          field: "Judul Dokumen",
          message: "Wajib diisi",
        });

      const doc_number = docNumRaw;
      if (!doc_number)
        rowErrors.push({
          row: rowNum,
          field: "No. Dokumen",
          message: "Wajib diisi",
        });

      const keteranganRaw = raw["Keterangan"];
      let revision: number = 0;
      let department_id: string | undefined;

      if (isMsds) {
        const ket = String(keteranganRaw ?? "").trim();
        const revMatch = ket.match(/^[Rr]ev\.?\s*(\d+)$/);
        if (revMatch) {
          revision = parseInt(revMatch[1]);
        } else {
          const num = parseInt(ket.replace(/\D/g, ""), 10);
          if (!isNaN(num) && num >= 0) {
            revision = num;
          } else {
            rowErrors.push({
              row: rowNum,
              field: "Keterangan",
              message: 'Format harus "Rev. 0", "Rev. 1", dst',
            });
          }
        }
      } else {
        const deptRaw = String(keteranganRaw ?? "").trim();
        if (!deptRaw) {
          rowErrors.push({
            row: rowNum,
            field: "Keterangan",
            message: "Wajib diisi (pilih dari dropdown departemen)",
          });
        } else {
          department_id = deptMap.get(deptRaw.toLowerCase());
          if (!department_id)
            rowErrors.push({
              row: rowNum,
              field: "Keterangan",
              message: `Departemen "${deptRaw}" tidak ditemukan`,
            });
        }
        const revisiRaw = String(raw["Rev"] ?? "").trim();
        if (revisiRaw !== "") {
          const revMatch = revisiRaw.match(/(\d+)/);
          revision = revMatch ? parseInt(revMatch[1]) : 0;
        }
      }

      const effective_date = parseDate(raw["Tgl Efektif"]) ?? undefined;

      const statusRaw = String(raw["Status"] ?? "")
        .trim()
        .toLowerCase();
      const status = STATUS_MAP[statusRaw];
      if (!status)
        rowErrors.push({
          row: rowNum,
          field: "Status",
          message: "Pilih: Terbaru, Kadaluarsa, atau Dihapus",
        });

      if (title && doc_number && !isNaN(revision) && status) {
        const isExistInDb = existingDocs.some(
          (doc) =>
            doc.doc_number.toLowerCase() === doc_number.toLowerCase() &&
            doc.title.toLowerCase() === title.toLowerCase() &&
            Number(doc.revision) === revision &&
            (doc.effective_date ?? null) === (effective_date ?? null) &&
            doc.status === status
        );

        const uniqueKey = `${doc_number}|${title}|${revision}|${
          effective_date ?? ""
        }|${status}`.toLowerCase();

        if (isExistInDb) {
          rowErrors.push({
            row: rowNum,
            field: "Data Duplikat",
            message: "Dokumen persis seperti ini sudah ada di Database",
          });
        } else if (excelDuplicateTracker.has(uniqueKey)) {
          rowErrors.push({
            row: rowNum,
            field: "Data Duplikat",
            message: "Duplikat dengan baris lain di dalam file Excel ini",
          });
        } else {
          excelDuplicateTracker.add(uniqueKey);
        }
      }

      let revision_date: string | undefined;
      if (isMsdsKimia) {
        revision_date = parseDate(raw["Tgl Revisi"]) ?? undefined;
      }

      let expiry_date: string | undefined;
      if (isMsdsBenang || isMsdsKimia) {
        expiry_date = parseDate(raw["Masa Berlaku"]) ?? undefined;
      }

      let production_type: string | undefined;
      if (isMsdsKimia) {
        const pt = String(raw["Production Type"] ?? "").trim();
        if (!pt)
          rowErrors.push({
            row: rowNum,
            field: "Production Type",
            message: "Wajib diisi",
          });
        production_type = normalizeProductionType(pt) ?? undefined;
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push({
          no: index + 1,
          title,
          doc_number,
          revision: isNaN(revision) ? 0 : revision,
          effective_date,
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
  } catch {
    return { success: false, error: "Gagal memproses file Excel." };
  }
}

// ============================================================
// IMPORT KE DATABASE
// ============================================================
export async function importDocuments(
  rows: ImportPreviewRow[]
): Promise<
  { success: true; count: number } | { success: false; error: string }
> {
  if (!rows.length)
    return { success: false, error: "Tidak ada data untuk diimport." };

  try {
    const insertData = rows.map((r) => ({
      doc_number: r.doc_number,
      title: r.title,
      category_id: r.category_id,
      type_id: r.type_id,
      department_id: r.department_id ?? null,
      revision: r.revision,
      effective_date: r.effective_date ?? null,
      revision_date: r.revision_date ?? null,
      expiry_date: r.expiry_date ?? null,
      production_type: r.production_type ?? null,
      status: r.status,
      uploaded_by: r.uploaded_by,
    }));

    const { error } = await supabaseAdmin.from("documents").insert(insertData);

    if (error) {
      console.error("Supabase Error Details:", error);
      if (error.code === "23505")
        return {
          success: false,
          error:
            "Beberapa dokumen sudah ada (nomor dokumen & revisi duplikat).",
        };
      return { success: false, error: "Gagal menyimpan data ke database." };
    }

    revalidatePath("/dashboard/documents");
    revalidatePath("/dashboard/dokumen-qesh");
    revalidatePath("/dashboard/msds");
    revalidatePath("/dashboard/dokumen-eksternal");
    return { success: true, count: rows.length };
  } catch {
    return { success: false, error: "Gagal mengimport dokumen." };
  }
}

// ============================================================
// GENERATE TEMPLATE
// ============================================================
export async function getTemplateColumns(docTypeName: string) {
  const extraKey = DOCUMENT_TYPE_KEY[docTypeName] ?? "";
  const extraFields = EXTRA_FIELDS[extraKey] ?? [];
  return { fixedFields: FIXED_FIELDS, extraFields };
}

// ============================================================
// DISTRIBUTIONS
// ============================================================
export type DistributionRecipientInput = {
  dept_id: string;
  head_name?: string | null;
  qty: number;
};

export type DistributionItemInput = {
  document_id: string;
  distributed_date?: string | null;
  recipients: DistributionRecipientInput[];
};

export async function createDistribution(
  formNumber: string,
  distributedDate: string,
  handedByDeptId: string,
  items: DistributionItemInput[],
  createdBy: string,
  notes: string
) {
  const { count } = await supabaseAdmin
    .from("distributions")
    .select("*", { count: "exact", head: true })
    .eq("form_number", formNumber);

  if ((count ?? 0) > 0) {
    return { error: "Nomor form sudah digunakan." };
  }

  const { data: dist, error: distErr } = await supabaseAdmin
    .from("distributions")
    .insert({
      form_number: formNumber,
      distributed_date: distributedDate,
      handed_by_dept_id: handedByDeptId,
      created_by: createdBy,
      notes: notes || null,
    })
    .select("id")
    .single();

  if (distErr || !dist) {
    return { error: distErr?.message ?? "Gagal membuat distribusi." };
  }

  for (const item of items) {
    const { data: distItem, error: itemErr } = await supabaseAdmin
      .from("distribution_items")
      .insert({
        distribution_id: dist.id,
        document_id: item.document_id,
        distributed_date: item.distributed_date ?? null,
      })
      .select("id")
      .single();

    if (itemErr || !distItem) {
      return { error: itemErr?.message ?? "Gagal menyimpan item dokumen." };
    }

    if (item.recipients.length > 0) {
      const { error: recipErr } = await supabaseAdmin
        .from("distribution_recipients")
        .insert(
          item.recipients.map((r) => ({
            distribution_item_id: distItem.id,
            dept_id: r.dept_id,
            head_name: r.head_name ?? null,
            qty: r.qty,
          }))
        );

      if (recipErr) {
        return { error: recipErr.message ?? "Gagal menyimpan penerima." };
      }
    }
  }

  revalidatePath("/distributions");
  return { success: true };
}

export async function updateDistribution(
  id: string,
  formNumber: string,
  distributedDate: string,
  handedByDeptId: string,
  items: DistributionItemInput[],
  notes: string
) {
  const { data: existing } = await supabaseAdmin
    .from("distributions")
    .select("id")
    .eq("form_number", formNumber)
    .neq("id", id)
    .single();

  if (existing) {
    return { error: "Nomor form sudah digunakan oleh distribusi lain." };
  }

  const { error: updateErr } = await supabaseAdmin
    .from("distributions")
    .update({
      form_number: formNumber,
      distributed_date: distributedDate,
      handed_by_dept_id: handedByDeptId,
      notes: notes || null,
    })
    .eq("id", id);

  if (updateErr) {
    return { error: updateErr.message ?? "Gagal mengupdate distribusi." };
  }

  const { error: deleteErr } = await supabaseAdmin
    .from("distribution_items")
    .delete()
    .eq("distribution_id", id);

  if (deleteErr) {
    return { error: deleteErr.message ?? "Gagal menghapus item lama." };
  }

  for (const item of items) {
    const { data: distItem, error: itemErr } = await supabaseAdmin
      .from("distribution_items")
      .insert({
        distribution_id: id,
        document_id: item.document_id,
        distributed_date: item.distributed_date ?? null,
      })
      .select("id")
      .single();

    if (itemErr || !distItem) {
      return { error: itemErr?.message ?? "Gagal menyimpan item dokumen." };
    }

    if (item.recipients.length > 0) {
      const { error: recipErr } = await supabaseAdmin
        .from("distribution_recipients")
        .insert(
          item.recipients.map((r) => ({
            distribution_item_id: distItem.id,
            dept_id: r.dept_id,
            head_name: r.head_name ?? null,
            qty: r.qty,
          }))
        );

      if (recipErr) {
        return { error: recipErr.message ?? "Gagal menyimpan penerima." };
      }
    }
  }

  revalidatePath("/distributions");
  return { success: true };
}

export async function deleteDistribution(id: string) {
  const { error } = await supabaseAdmin
    .from("distributions")
    .delete()
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/distributions");
  return { success: true };
}

export async function fetchNextFormNumber(): Promise<string> {
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
  return `${nextNum}/DCC/${mm}/${yy}`;
}

// ============================================================
// REVALIDATE HELPER
// ============================================================
const REVALIDATE_PATHS = [
  "/dashboard/dokumen-eksternal",
  "/dashboard/dokumen-eksternal/[id]",
  "/dashboard/documents",
];

function revalidateAll() {
  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
}

// ============================================================
// CREATE EXTERNAL DOCUMENT
// ============================================================
export async function createExternalDocument(formData: FormData) {
  const doc_number = (formData.get("doc_number") as string)?.trim();
  const title = (formData.get("title") as string)?.trim();
  const category_id = formData.get("category_id") as string;
  const type_id = formData.get("type_id") as string;
  const uploaded_by = formData.get("uploaded_by") as string;
  const type_name = (formData.get("type_name") as string)?.trim().toLowerCase();

  const effective_date = (formData.get("effective_date") as string) || null;
  const expiry_date = (formData.get("expiry_date") as string) || null;
  const revision_raw = formData.get("revision") as string;
  const revision = revision_raw ? parseInt(revision_raw) : 0;
  const status = (formData.get("status") as string) || "terbaru";

  if (!doc_number || !title || !category_id || !type_id)
    return { error: "Field wajib belum lengkap." };

  try {
    // 1. Insert ke tabel documents
    const { data: doc, error: docError } = await supabaseAdmin
      .from("documents")
      .insert({
        doc_number,
        title,
        category_id,
        type_id,
        revision,
        effective_date,
        expiry_date,
        status,
        uploaded_by,
      })
      .select("id")
      .single();

    if (docError) {
      if (docError.code === "23505")
        return { error: "Nomor dokumen sudah ada." };
      return { error: "Gagal membuat dokumen." };
    }

    const document_id = doc.id;
    const isKal = type_name === "kal";

    // 2. Insert ke document_external (semua jenis kecuali KAL)
    const needsExternal = ["coa", "diu", "itp", "pip", "spk", "tes"].includes(
      type_name ?? ""
    );

    if (needsExternal) {
      const source = (formData.get("source") as string)?.trim() || null;
      const test_report_no =
        (formData.get("test_report_no") as string)?.trim() || null;

      const { error: extError } = await supabaseAdmin
        .from("document_external") // ✅ nama tabel yang benar
        .insert({ document_id, source, test_report_no });

      if (extError) {
        console.error("❌ ERROR DOCUMENT_EXTERNAL:", extError);
        return {
          error: `Gagal menyimpan data eksternal. (Kode: ${extError.code} - ${extError.message})`,
        };
      }
    }

    // 3. Insert ke document_external_kal (khusus KAL)
    if (isKal) {
      const no_order = (formData.get("no_order") as string)?.trim() || null;
      const item_type = (formData.get("item_type") as string)?.trim() || null;
      const brand = (formData.get("brand") as string)?.trim() || null;
      const model = (formData.get("model") as string)?.trim() || null;
      const serial_no = (formData.get("serial_no") as string)?.trim() || null;
      const calibration_date =
        (formData.get("calibration_date") as string) || null;

      const { error: kalError } = await supabaseAdmin
        .from("document_external_kal") // ✅ nama tabel yang benar
        .insert({
          document_id,
          no_order,
          item_type,
          brand,
          model,
          serial_no,
          calibration_date,
        });

      if (kalError)
        return { error: "Dokumen tersimpan tapi gagal menyimpan data KAL." };
    }

    revalidateAll();
    return { success: true, id: document_id };
  } catch {
    return { error: "Gagal membuat dokumen eksternal." };
  }
}

// ============================================================
// UPDATE EXTERNAL DOCUMENT
// ============================================================
export async function updateExternalDocument(id: string, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const type_id = formData.get("type_id") as string;
  const type_name = (formData.get("type_name") as string)?.trim().toLowerCase();
  const effective_date = (formData.get("effective_date") as string) || null;
  const expiry_date = (formData.get("expiry_date") as string) || null;
  const revision_raw = formData.get("revision") as string;
  const revision = revision_raw ? parseInt(revision_raw) : 0;
  const status = (formData.get("status") as string) || "terbaru";

  if (!title || !type_id) return { error: "Field wajib belum lengkap." };

  const isKal = type_name === "kal";

  try {
    // 1. Update tabel documents (doc_number tidak diupdate)
    const { error: docError } = await supabaseAdmin
      .from("documents")
      .update({
        title,
        type_id,
        revision,
        effective_date,
        expiry_date,
        status,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);

    if (docError) return { error: "Gagal mengupdate dokumen." };

    // 2. Upsert document_external (semua jenis kecuali KAL)
    if (!isKal) {
      const source = (formData.get("source") as string)?.trim() || null;
      const test_report_no =
        (formData.get("test_report_no") as string)?.trim() || null;

      const { error: extError } = await supabaseAdmin
        .from("document_external") // ✅ nama tabel yang benar
        .upsert(
          { document_id: id, source, test_report_no },
          { onConflict: "document_id" }
        );

      if (extError)
        return { error: "Dokumen terupdate tapi gagal update data eksternal." };
    }

    // 3. Upsert document_external_kal
    if (isKal) {
      const no_order = (formData.get("no_order") as string)?.trim() || null;
      const item_type = (formData.get("item_type") as string)?.trim() || null;
      const brand = (formData.get("brand") as string)?.trim() || null;
      const model = (formData.get("model") as string)?.trim() || null;
      const serial_no = (formData.get("serial_no") as string)?.trim() || null;
      const calibration_date =
        (formData.get("calibration_date") as string) || null;

      const { error: kalError } = await supabaseAdmin
        .from("document_external_kal") // ✅ nama tabel yang benar
        .upsert(
          {
            document_id: id,
            no_order,
            item_type,
            brand,
            model,
            serial_no,
            calibration_date,
          },
          { onConflict: "document_id" }
        );

      if (kalError)
        return { error: "Dokumen terupdate tapi gagal update data KAL." };
    }

    revalidateAll();
    return { success: true };
  } catch {
    return { error: "Gagal mengupdate dokumen eksternal." };
  }
}

// ============================================================
// DELETE EXTERNAL DOCUMENT
// ============================================================
export async function deleteExternalDocument(id: string) {
  try {
    // Hapus data relasi dulu sebelum hapus dokumen utama
    await supabaseAdmin
      .from("document_external") // ✅ nama tabel yang benar
      .delete()
      .eq("document_id", id);

    await supabaseAdmin
      .from("document_external_kal") // ✅ nama tabel yang benar
      .delete()
      .eq("document_id", id);

    const { error } = await supabaseAdmin
      .from("documents")
      .delete()
      .eq("id", id);

    if (error) return { error: "Gagal menghapus dokumen." };

    revalidateAll();
    return { success: true };
  } catch {
    return { error: "Gagal menghapus dokumen eksternal." };
  }
}

// ============================================================
// MASTER CUSTOMERS
// ============================================================
export async function createCustomer(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim() || null;

  if (!name) return { error: "Nama perusahaan wajib diisi." };

  try {
    const { error } = await supabaseAdmin
      .from("master_customers")
      .insert({ name, code });
    if (error) {
      if (error.code === "23505") return { error: "Customer sudah ada." };
      return { error: "Gagal membuat customer." };
    }
    revalidatePath("/dashboard/master/customer");
    return { success: true };
  } catch {
    return { error: "Gagal membuat customer." };
  }
}

export async function updateCustomer(id: string, formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  const code = (formData.get("code") as string)?.trim() || null;

  if (!name) return { error: "Nama perusahaan wajib diisi." };

  try {
    const { error } = await supabaseAdmin
      .from("master_customers")
      .update({ name, code, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return { error: "Gagal mengupdate customer." };
    revalidatePath("/dashboard/master/customer");
    return { success: true };
  } catch {
    return { error: "Gagal mengupdate customer." };
  }
}

export async function deleteCustomer(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from("master_customers")
      .delete()
      .eq("id", id);
    if (error) return { error: "Gagal menghapus customer." };
    revalidatePath("/dashboard/master/customer");
    return { success: true };
  } catch {
    return { error: "Gagal menghapus customer." };
  }
}

// ============================================================
// HELPER: parse tanggal fleksibel dari Excel
// Mendukung format: DD/MM/YYYY, MM/YYYY, atau YYYY saja.
// Jika bagian tanggal/bulan tidak diisi, di-padding ke 01.
// Contoh:
//   "18/06/2026" -> "2026-06-18"
//   "06/2026"    -> "2026-06-01"
//   "2026"       -> "2026-01-01"
//   2026 (number)-> "2026-01-01"  (Excel kadang baca tahun sebagai number)
// ============================================================
function parseDateFlexible(value: unknown): string | null {
  if (value === null || value === undefined) return null;

  // Excel serial date number (tanggal lengkap dari date picker)
  if (typeof value === "number") {
    // Heuristik: serial date Excel biasanya > 10000 (tahun 1927+).
    // Kalau angkanya kecil (misal 2026), anggap itu input tahun polos, bukan serial date.
    if (value > 10000) {
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split("T")[0];
    }
    const y = Math.trunc(value);
    if (y >= 1900 && y <= 2200) {
      return `${y}-01-01`;
    }
    return null;
  }

  if (typeof value !== "string") return null;
  const s = value.trim();
  if (!s) return null;

  // Format lengkap DD/MM/YYYY
  const dmyMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  // Format ISO YYYY-MM-DD (sudah lengkap)
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // Format MM/YYYY -> padding tanggal ke 01
  const myMatch = s.match(/^(\d{1,2})\/(\d{4})$/);
  if (myMatch) {
    const [, m, y] = myMatch;
    return `${y}-${m.padStart(2, "0")}-01`;
  }

  // Format YYYY saja -> padding bulan & tanggal ke 01-01
  const yMatch = s.match(/^(\d{4})$/);
  if (yMatch) {
    const [, y] = yMatch;
    return `${y}-01-01`;
  }

  return null;
}

// ============================================================
// IMPORT EXTERNAL DOCUMENTS — TYPES (tidak berubah dari sebelumnya,
// kecuali doc_number sekarang opsional secara semantik untuk KAL)
// ============================================================

export type ExternalImportRow = {
  // Kolom universal
  doc_number: string; // boleh kosong khusus untuk KAL
  title: string;
  status: string;
  source: string | null; // dari kolom "Keterangan"
  // Per jenis
  effective_date?: string; // COA, DIU(dihapus), TES, ITP
  revision?: number; // ITP
  test_report_no?: string; // TES
  expiry_date?: string; // KAL
  no_order?: string; // KAL — sekarang jadi unique key untuk KAL
  item_type?: string; // KAL
  brand?: string; // KAL
  model?: string; // KAL
  serial_no?: string; // KAL
  calibration_date?: string; // KAL
  // Metadata (diisi server)
  type_id: string;
  category_id: string;
  uploaded_by: string;
  type_name: string;
};

export type ExternalImportRowError = {
  row: number;
  field: string;
  message: string;
};

export type ParseExternalResult =
  | {
      success: true;
      rows: ExternalImportRow[];
      errors: ExternalImportRowError[];
    }
  | { success: false; error: string };

// Kolom wajib per jenis
// Perubahan:
//   - COA: "Status" dihapus dari kolom wajib (kolom Status tidak ada di template COA)
//   - DIU: "Tanggal" diganti "Keterangan"
//   - KAL: "No. Dokumen" dihapus dari wajib (jadi opsional)
const EXT_REQUIRED: Record<string, string[]> = {
  coa: ["Judul Dokumen", "No. Dokumen", "Keterangan", "Tanggal"],
  diu: ["Judul Dokumen", "No. Dokumen", "Keterangan", "Status"],
  itp: ["Judul Dokumen", "No. Dokumen", "Keterangan", "Status"],
  kal: ["Judul Dokumen", "No. Order", "Tgl Pengujian / Masa Berlaku", "Status"],
  pip: ["Judul Dokumen", "No. Dokumen", "Status"],
  spk: ["Judul Dokumen", "No. Dokumen", "Status"],
  tes: ["Judul Dokumen", "No. Dokumen", "Keterangan", "Tanggal", "Status"],
};

export async function parseExternalImportData(
  rows: Record<string, unknown>[],
  typeName: string,
  typeId: string,
  categoryId: string,
  uploadedBy: string
): Promise<ParseExternalResult> {
  try {
    const t = typeName.toLowerCase();
    const requiredCols = EXT_REQUIRED[t] ?? [
      "Judul Dokumen",
      "No. Dokumen",
      "Status",
    ];
    const isKal = t === "kal";
    const isCoa = t === "coa";

    // ── Ambil data existing dari DB untuk cek duplikat ──
    // Untuk KAL, kita cek duplikat berdasarkan No. Order (unique key baru).
    // Untuk jenis lain, tetap berdasarkan No. Dokumen seperti sebelumnya.
    const excelDocNumbers = rows
      .map((r) => String(r["No. Dokumen"] ?? "").trim())
      .filter(Boolean);

    let existingDocs: any[] = [];
    if (!isKal && excelDocNumbers.length > 0) {
      const { data } = await supabaseAdmin
        .from("documents")
        .select("doc_number, title, status")
        .in("doc_number", excelDocNumbers);
      existingDocs = data ?? [];
    }

    let existingKalOrders: any[] = [];
    if (isKal) {
      const excelOrderNumbers = rows
        .map((r) => String(r["No. Order"] ?? "").trim())
        .filter(Boolean);
      if (excelOrderNumbers.length > 0) {
        const { data } = await supabaseAdmin
          .from("document_external_kal")
          .select("no_order, document_id")
          .in("no_order", excelOrderNumbers);
        existingKalOrders = data ?? [];
      }
    }

    const validRows: ExternalImportRow[] = [];
    const errors: ExternalImportRowError[] = [];
    const excelDuplicateTracker = new Set<string>();
    const START_ROW = 16; // sama seperti MSDS (header 14 baris + 2 baris header tabel)

    rows.forEach((raw, index) => {
      const rowNum = index + START_ROW;
      const rowErrors: ExternalImportRowError[] = [];

      const titleRaw = String(raw["Judul Dokumen"] ?? "").trim();
      const docNumRaw = String(raw["No. Dokumen"] ?? "").trim();
      const noOrderRaw = String(raw["No. Order"] ?? "").trim();

      // Skip baris kosong.
      // Untuk KAL, baris dianggap kosong kalau Judul & No. Order kosong
      // (karena No. Dokumen sudah opsional untuk KAL).
      if (isKal) {
        if (!titleRaw && !noOrderRaw) return;
      } else {
        if (!titleRaw && !docNumRaw) return;
      }

      // ── Judul Dokumen (selalu wajib) ──
      if (!titleRaw)
        rowErrors.push({
          row: rowNum,
          field: "Judul Dokumen",
          message: "Wajib diisi",
        });

      // ── No. Dokumen ──
      // Wajib untuk semua jenis KECUALI KAL (opsional di KAL).
      if (!isKal && !docNumRaw)
        rowErrors.push({
          row: rowNum,
          field: "No. Dokumen",
          message: "Wajib diisi",
        });

      // ── No. Order (khusus KAL, wajib & jadi unique key) ──
      if (isKal && !noOrderRaw)
        rowErrors.push({
          row: rowNum,
          field: "No. Order",
          message: "Wajib diisi",
        });

      // ── Keterangan → source ──
      const source = String(raw["Keterangan"] ?? "").trim() || null;
      if (requiredCols.includes("Keterangan") && !source)
        rowErrors.push({
          row: rowNum,
          field: "Keterangan",
          message: "Wajib diisi",
        });

      // ── Status ──
      // COA tidak punya kolom Status di template -> otomatis "terbaru".
      let status: string | undefined;
      if (isCoa) {
        status = "terbaru";
      } else {
        const statusRaw = String(raw["Status"] ?? "")
          .trim()
          .toLowerCase();
        status = STATUS_MAP[statusRaw];
        if (!status)
          rowErrors.push({
            row: rowNum,
            field: "Status",
            message: "Pilih: Terbaru, Kadaluarsa, atau Dihapus",
          });
      }

      // ── Tanggal (COA, TES) ──
      // Catatan: DIU sudah tidak punya kolom Tanggal, diganti Keterangan.
      let effective_date: string | undefined;
      if (raw["Tanggal"] !== undefined) {
        effective_date = parseDate(raw["Tanggal"]) ?? undefined;
        if (requiredCols.includes("Tanggal") && !effective_date)
          rowErrors.push({
            row: rowNum,
            field: "Tanggal",
            message: "Wajib diisi (format: DD/MM/YYYY)",
          });
      }

      // ── Tgl Efektif (ITP) opsional ──
      let itp_effective_date: string | undefined;
      if (raw["Tgl Efektif"] !== undefined) {
        itp_effective_date = parseDate(raw["Tgl Efektif"]) ?? undefined;
      }

      // ── Revisi (ITP) opsional ──
      let revision: number | undefined;
      if (raw["Revisi"] !== undefined) {
        const revRaw = String(raw["Revisi"] ?? "").trim();
        if (revRaw !== "") {
          const num = parseInt(revRaw.replace(/\D/g, ""), 10);
          revision = isNaN(num) ? 0 : num;
        }
      }

      // ── Test Report No (TES) opsional ──
      const test_report_no =
        raw["Test Report No."] !== undefined
          ? String(raw["Test Report No."] ?? "").trim() || undefined
          : undefined;

      // ── KAL fields ──
      // Tgl Pengujian/Masa Berlaku dan Tgl Kalibrasi sekarang pakai
      // parseDateFlexible: boleh DD/MM/YYYY, MM/YYYY, atau YYYY saja.
      let expiry_date: string | undefined;
      let no_order: string | undefined;
      let item_type: string | undefined;
      let brand: string | undefined;
      let model: string | undefined;
      let serial_no: string | undefined;
      let calibration_date: string | undefined;

      if (isKal) {
        expiry_date =
          parseDateFlexible(raw["Tgl Pengujian / Masa Berlaku"]) ?? undefined;
        if (!expiry_date)
          rowErrors.push({
            row: rowNum,
            field: "Tgl Pengujian / Masa Berlaku",
            message: "Wajib diisi (format: DD/MM/YYYY, MM/YYYY, atau YYYY)",
          });

        no_order = noOrderRaw || undefined;
        item_type = String(raw["Jenis"] ?? "").trim() || undefined;
        brand = String(raw["Merek"] ?? "").trim() || undefined;
        model = String(raw["Model"] ?? "").trim() || undefined;
        serial_no = String(raw["No. Seri"] ?? "").trim() || undefined;
        calibration_date = parseDateFlexible(raw["Tgl Kalibrasi"]) ?? undefined;
      }

      // ── Cek duplikat ──
      if (isKal) {
        // Untuk KAL, duplikat dicek berdasarkan No. Order (unique key).
        if (noOrderRaw) {
          const isExistInDb = existingKalOrders.some(
            (k) => String(k.no_order).toLowerCase() === noOrderRaw.toLowerCase()
          );
          const uniqueKey = noOrderRaw.toLowerCase();

          if (isExistInDb) {
            rowErrors.push({
              row: rowNum,
              field: "Data Duplikat",
              message: `No. Order "${noOrderRaw}" sudah ada di database`,
            });
          } else if (excelDuplicateTracker.has(uniqueKey)) {
            rowErrors.push({
              row: rowNum,
              field: "Data Duplikat",
              message:
                "Duplikat dengan baris lain di file ini (No. Order sama)",
            });
          } else {
            excelDuplicateTracker.add(uniqueKey);
          }
        }
      } else if (titleRaw && docNumRaw && status) {
        const isExistInDb = existingDocs.some(
          (doc) =>
            doc.doc_number.toLowerCase() === docNumRaw.toLowerCase() &&
            doc.title.toLowerCase() === titleRaw.toLowerCase() &&
            doc.status === status
        );
        const uniqueKey = `${docNumRaw}|${titleRaw}|${status}`.toLowerCase();

        if (isExistInDb) {
          rowErrors.push({
            row: rowNum,
            field: "Data Duplikat",
            message: "Dokumen ini sudah ada di database",
          });
        } else if (excelDuplicateTracker.has(uniqueKey)) {
          rowErrors.push({
            row: rowNum,
            field: "Data Duplikat",
            message: "Duplikat dengan baris lain di file ini",
          });
        } else {
          excelDuplicateTracker.add(uniqueKey);
        }
      }

      if (rowErrors.length > 0) {
        errors.push(...rowErrors);
      } else {
        validRows.push({
          doc_number: docNumRaw, // boleh string kosong untuk KAL
          title: titleRaw,
          status: status!,
          source: source,
          effective_date: isKal
            ? undefined
            : t === "itp"
            ? itp_effective_date
            : effective_date,
          revision: t === "itp" ? revision ?? 0 : undefined,
          test_report_no,
          expiry_date,
          no_order,
          item_type,
          brand,
          model,
          serial_no,
          calibration_date,
          type_id: typeId,
          category_id: categoryId,
          uploaded_by: uploadedBy,
          type_name: typeName,
        });
      }
    });

    return { success: true, rows: validRows, errors };
  } catch (e) {
    console.error(e);
    return { success: false, error: "Gagal memproses file Excel." };
  }
}

export async function importExternalDocuments(
  rows: ExternalImportRow[]
): Promise<
  { success: true; count: number } | { success: false; error: string }
> {
  if (!rows.length)
    return { success: false, error: "Tidak ada data untuk diimport." };

  let successCount = 0;

  for (const row of rows) {
    try {
      const t = row.type_name.toLowerCase();
      const isKal = t === "kal";

      // 1. Insert ke documents
      // Untuk KAL, doc_number boleh kosong -> simpan sebagai null supaya
      // tidak melanggar constraint unik doc_number+revision jika ada
      // beberapa baris KAL tanpa No. Dokumen.
      const { data: doc, error: docError } = await supabaseAdmin
        .from("documents")
        .insert({
          doc_number: row.doc_number || null,
          title: row.title,
          category_id: row.category_id,
          type_id: row.type_id,
          revision: row.revision ?? 0,
          effective_date: row.effective_date ?? null,
          expiry_date: row.expiry_date ?? null,
          status: row.status,
          uploaded_by: row.uploaded_by,
        })
        .select("id")
        .single();

      if (docError) {
        if (docError.code === "23505") continue; // skip duplikat
        return {
          success: false,
          error: `Gagal insert dokumen "${
            (row.doc_number || row.no_order) ?? "(tanpa nomor)"
          }": ${docError.message}`,
        };
      }

      const document_id = doc.id;

      // 2. Insert ke document_external (semua kecuali KAL)
      if (!isKal) {
        const { error: extError } = await supabaseAdmin
          .from("document_external")
          .insert({
            document_id,
            source: row.source ?? null,
            test_report_no: row.test_report_no ?? null,
          });

        if (extError) {
          return {
            success: false,
            error: `Gagal simpan data eksternal "${row.doc_number}": ${extError.message}`,
          };
        }
      }

      // 3. Insert ke document_external_kal (khusus KAL)
      if (isKal) {
        const { error: kalError } = await supabaseAdmin
          .from("document_external_kal")
          .insert({
            document_id,
            no_order: row.no_order ?? null,
            item_type: row.item_type ?? null,
            brand: row.brand ?? null,
            model: row.model ?? null,
            serial_no: row.serial_no ?? null,
            calibration_date: row.calibration_date ?? null,
          });

        if (kalError) {
          // Constraint unik pada no_order (perlu ditambahkan di DB, lihat catatan di bawah)
          if (kalError.code === "23505") continue; // skip duplikat No. Order
          return {
            success: false,
            error: `Gagal simpan data KAL "${row.no_order}": ${kalError.message}`,
          };
        }
      }

      successCount++;
    } catch (e: any) {
      return {
        success: false,
        error: `Error pada baris "${row.doc_number || row.no_order}": ${
          e.message
        }`,
      };
    }
  }

  REVALIDATE_PATHS.forEach((p) => revalidatePath(p));
  return { success: true, count: successCount };
}

// ============================================================
// EMPLOYEES — tambahkan ke app/lib/actions.ts
// ============================================================

// Schema
const EmployeeSchema = z.object({
  nik: z.string().min(1, "NIK wajib diisi"),
  name: z.string().min(1, "Nama wajib diisi"),
  department_id: z.string().optional().nullable(),
  join_date: z.string().optional().nullable(),
});

// CREATE
export async function createEmployee(formData: FormData) {
  const parsed = EmployeeSchema.safeParse({
    nik: formData.get("nik"),
    name: formData.get("name"),
    department_id: formData.get("department_id") || null,
    join_date: formData.get("join_date") || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { nik, name, department_id, join_date } = parsed.data;

  try {
    const { error } = await supabaseAdmin
      .from("master_employees")
      .insert({ nik, name, department_id, join_date });
    if (error) {
      if (error.code === "23505") return { error: "NIK sudah terdaftar." };
      return { error: "Gagal menambah karyawan." };
    }
    revalidatePath("/dashboard/master/employees");
    return { success: true };
  } catch {
    return { error: "Gagal menambah karyawan." };
  }
}

// UPDATE
export async function updateEmployee(id: string, formData: FormData) {
  const parsed = EmployeeSchema.safeParse({
    nik: formData.get("nik"),
    name: formData.get("name"),
    department_id: formData.get("department_id") || null,
    join_date: formData.get("join_date") || null,
  });
  if (!parsed.success) return { error: parsed.error.errors[0].message };
  const { nik, name, department_id, join_date } = parsed.data;

  try {
    const { error } = await supabaseAdmin
      .from("master_employees")
      .update({
        nik,
        name,
        department_id,
        join_date,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    if (error) {
      if (error.code === "23505") return { error: "NIK sudah terdaftar." };
      return { error: "Gagal mengupdate karyawan." };
    }
    revalidatePath("/dashboard/master/employees");
    return { success: true };
  } catch {
    return { error: "Gagal mengupdate karyawan." };
  }
}

// DELETE
export async function deleteEmployee(id: string) {
  try {
    const { error } = await supabaseAdmin
      .from("master_employees")
      .delete()
      .eq("id", id);
    if (error) return { error: "Gagal menghapus karyawan." };
    revalidatePath("/dashboard/master/employees");
    return { success: true };
  } catch {
    return { error: "Gagal menghapus karyawan." };
  }
}

// IMPORT BULK
export async function importEmployees(
  rows: {
    nik: string;
    name: string;
    department_id: string | null;
    join_date: string | null;
  }[]
): Promise<
  { success: true; count: number } | { success: false; error: string }
> {
  if (!rows.length)
    return { success: false, error: "Tidak ada data untuk diimport." };

  try {
    const { error } = await supabaseAdmin.from("master_employees").insert(rows);
    if (error) {
      if (error.code === "23505")
        return {
          success: false,
          error: "Beberapa NIK sudah terdaftar (duplikat).",
        };
      return { success: false, error: "Gagal menyimpan data ke database." };
    }
    revalidatePath("/dashboard/master/employees");
    return { success: true, count: rows.length };
  } catch {
    return { success: false, error: "Gagal mengimport karyawan." };
  }
}
