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

// ── Production type normalisasi (module-level agar bisa dipakai semua fungsi) ──
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

  // 1. Ambil semua keys dari formData
  const keys = Array.from(formData.keys());

  // 2. Filter keys yang berawalan "head_name_" untuk mencari ada berapa kepala bagian
  const headIndices = keys
    .filter((k) => k.startsWith("head_name_"))
    .map((k) => k.split("_")[2]); // Mengambil angka indeksnya (0, 1, dst)

  const heads = headIndices
    .map((index) => ({
      name: formData.get(`head_name_${index}`) as string,
      title: formData.get(`head_title_${index}`) as string,
    }))
    .filter((h) => h.name && h.title); // Pastikan tidak kosong

  if (!code || !name) return { error: "Kode dan Nama departemen wajib diisi." };

  try {
    // 1. Insert ke departments
    const { data: deptData, error: deptError } = await supabaseAdmin
      .from("departments")
      .insert({ code, name })
      .select("id")
      .single();

    if (deptError || !deptData) {
      console.error("Dept Error:", deptError);
      return { error: "Gagal membuat departemen." };
    }

    // 3. Sekarang variabel 'heads' sudah berisi array objek yang benar
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
  // Ubah key dari "heads" menjadi "heads_json" sesuai log Anda
  const headsRaw = formData.get("heads_json") as string;
  const heads = headsRaw ? JSON.parse(headsRaw) : [];

  if (!code || !name) return { error: "Kode dan Nama departemen wajib diisi." };

  try {
    // 1. Update tabel departments
    const { error: deptError } = await supabaseAdmin
      .from("departments")
      .update({ code, name })
      .eq("id", id);

    if (deptError) throw new Error("Gagal update tabel utama.");

    // 2. Refresh heads: Hapus semua
    const { error: deleteError } = await supabaseAdmin
      .from("department_heads")
      .delete()
      .eq("department_id", id);

    if (deleteError) throw new Error("Gagal menghapus data kepala lama.");

    // 3. Insert yang baru
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
  effective_date?: string; // ← opsional
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
// HELPER: parse tanggal dari Excel (serial number atau string)
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

    // Lookup departemen: "CODE - Nama" → id
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

    // Ambil doc_number dari excel untuk validasi duplikat ke DB
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

      // Skip baris kosong
      if (!titleRaw && !docNumRaw) return;

      // ── Judul Dokumen ──
      const title = titleRaw;
      if (!title)
        rowErrors.push({
          row: rowNum,
          field: "Judul Dokumen",
          message: "Wajib diisi",
        });

      // ── No. Dokumen ──
      const doc_number = docNumRaw;
      if (!doc_number)
        rowErrors.push({
          row: rowNum,
          field: "No. Dokumen",
          message: "Wajib diisi",
        });

      // ── Keterangan → Revision (MSDS) atau Department (QESH) ──
      const keteranganRaw = raw["Keterangan"];
      let revision: number = 0;
      let department_id: string | undefined;

      if (isMsds) {
        // Format "Rev. X" atau angka langsung
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
        // QESH: Keterangan = "CODE - Nama Departemen"
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
      }

      // ── Tgl Efektif — OPSIONAL ──
      const effective_date = parseDate(raw["Tgl Efektif"]) ?? undefined;
      // tidak ada error jika kosong

      // ── Status ──
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

      // ── Validasi duplikat (tanpa syarat effective_date wajib ada) ──
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

      // ── Tgl Revisi (MSDS Kimia) — OPSIONAL ──
      let revision_date: string | undefined;
      if (isMsdsKimia) {
        revision_date = parseDate(raw["Tgl Revisi"]) ?? undefined;
        // tidak ada error jika kosong
      }

      // ── Masa Berlaku (MSDS Benang & Kimia) — OPSIONAL ──
      let expiry_date: string | undefined;
      if (isMsdsBenang || isMsdsKimia) {
        expiry_date = parseDate(raw["Masa Berlaku"]) ?? undefined;
        // tidak ada error jika kosong
      }

      // ── Production Type (MSDS Kimia) — tetap wajib ──
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
      effective_date: r.effective_date ?? null, // ← opsional, kirim null jika kosong
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

export type DistributionItemInput = {
  document_id: string;
  quantity: number;
};

export async function createDistribution(
  formNumber: string,
  distributedDate: string,
  handedByDeptId: string,
  items: DistributionItemInput[],
  recipientDeptIds: string[],
  createdBy: string,
  notes?: string
) {
  if (!formNumber?.trim()) return { error: "Nomor form wajib diisi." };
  if (!distributedDate) return { error: "Tanggal distribusi wajib diisi." };
  if (!handedByDeptId) return { error: "Departemen pengirim wajib dipilih." };
  if (!items.length) return { error: "Minimal 1 dokumen harus dipilih." };
  if (!recipientDeptIds.length)
    return { error: "Minimal 1 departemen penerima harus dipilih." };
  if (items.length > 40)
    return { error: "Maksimal 40 dokumen per form distribusi." };

  // Cek duplikat form_number
  const { data: existing } = await supabaseAdmin
    .from("distributions")
    .select("id")
    .eq("form_number", formNumber.trim())
    .single();

  if (existing) return { error: "Nomor form sudah digunakan." };

  try {
    // 1. Insert header
    const { data: dist, error: distError } = await supabaseAdmin
      .from("distributions")
      .insert({
        form_number: formNumber.trim(),
        distributed_date: distributedDate,
        handed_by_dept_id: handedByDeptId,
        notes: notes?.trim() || null,
        created_by: createdBy,
      })
      .select("id")
      .single();

    if (distError || !dist) return { error: "Gagal membuat form distribusi." };

    const distributionId = dist.id;

    // 2. Insert items
    const itemsToInsert = items.map((item) => ({
      distribution_id: distributionId,
      document_id: item.document_id,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("distribution_items")
      .insert(itemsToInsert);

    if (itemsError) {
      await supabaseAdmin
        .from("distributions")
        .delete()
        .eq("id", distributionId);
      return { error: "Gagal menyimpan daftar dokumen." };
    }

    // 3. Insert recipients
    const recipientsToInsert = recipientDeptIds.map((deptId) => ({
      distribution_id: distributionId,
      dept_id: deptId,
    }));

    const { error: recipientsError } = await supabaseAdmin
      .from("distribution_recipients")
      .insert(recipientsToInsert);

    if (recipientsError) {
      await supabaseAdmin
        .from("distributions")
        .delete()
        .eq("id", distributionId);
      return { error: "Gagal menyimpan daftar penerima." };
    }

    revalidatePath("/dashboard/document-control/distributions");
    return { success: true, id: distributionId };
  } catch {
    return { error: "Gagal membuat form distribusi." };
  }
}

export async function updateDistribution(
  id: string,
  formNumber: string,
  distributedDate: string,
  handedByDeptId: string,
  items: DistributionItemInput[],
  recipientDeptIds: string[],
  notes?: string
) {
  if (!formNumber?.trim()) return { error: "Nomor form wajib diisi." };
  if (!distributedDate) return { error: "Tanggal distribusi wajib diisi." };
  if (!handedByDeptId) return { error: "Departemen pengirim wajib dipilih." };
  if (!items.length) return { error: "Minimal 1 dokumen harus dipilih." };
  if (!recipientDeptIds.length)
    return { error: "Minimal 1 departemen penerima harus dipilih." };
  if (items.length > 40)
    return { error: "Maksimal 40 dokumen per form distribusi." };

  // Cek duplikat form_number (exclude diri sendiri)
  const { data: existing } = await supabaseAdmin
    .from("distributions")
    .select("id")
    .eq("form_number", formNumber.trim())
    .neq("id", id)
    .single();

  if (existing) return { error: "Nomor form sudah digunakan." };

  try {
    // 1. Update header
    const { error: distError } = await supabaseAdmin
      .from("distributions")
      .update({
        form_number: formNumber.trim(),
        distributed_date: distributedDate,
        handed_by_dept_id: handedByDeptId,
        notes: notes?.trim() || null,
      })
      .eq("id", id);

    if (distError) return { error: "Gagal mengupdate form distribusi." };

    // 2. Replace items (delete + insert)
    await supabaseAdmin
      .from("distribution_items")
      .delete()
      .eq("distribution_id", id);

    const itemsToInsert = items.map((item) => ({
      distribution_id: id,
      document_id: item.document_id,
      quantity: item.quantity,
    }));

    const { error: itemsError } = await supabaseAdmin
      .from("distribution_items")
      .insert(itemsToInsert);

    if (itemsError) return { error: "Gagal mengupdate daftar dokumen." };

    // 3. Replace recipients (delete + insert)
    await supabaseAdmin
      .from("distribution_recipients")
      .delete()
      .eq("distribution_id", id);

    const recipientsToInsert = recipientDeptIds.map((deptId) => ({
      distribution_id: id,
      dept_id: deptId,
    }));

    const { error: recipientsError } = await supabaseAdmin
      .from("distribution_recipients")
      .insert(recipientsToInsert);

    if (recipientsError) return { error: "Gagal mengupdate daftar penerima." };

    revalidatePath("/dashboard/document-control/distributions");
    return { success: true };
  } catch {
    return { error: "Gagal mengupdate form distribusi." };
  }
}

export async function deleteDistribution(id: string) {
  try {
    // CASCADE akan hapus items & recipients otomatis
    const { error } = await supabaseAdmin
      .from("distributions")
      .delete()
      .eq("id", id);

    if (error) return { error: "Gagal menghapus form distribusi." };

    revalidatePath("/dashboard/document-control/distributions");
    return { success: true };
  } catch {
    return { error: "Gagal menghapus form distribusi." };
  }
}
