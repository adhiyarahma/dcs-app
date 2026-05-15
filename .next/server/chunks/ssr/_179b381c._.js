module.exports = {

"[project]/app/lib/actions.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
/* __next_internal_action_entry_do_not_use__ [{"4037b79f60e732ac9b5967d422151b8ca2b9853282":"createDepartment","40433427b6e0fbe036ba1fb2c5388102d0696fec88":"createDocument","40472c6a82d5ec8851ba817f9169bc2afd792fc9e0":"deleteCategory","406495fb26cf5d257b087a256ac2a44b216e8b0add":"createUser","407227442becece0969aadd24a95f17e15f81ec97a":"deleteDocumentFile","407c392a5757c05f439d5cbc96ffe51bb0ae555413":"deleteDocument","408a3d549f3f6a242bc06a512897fe35984e46a6bb":"createCategory","408b22e9c7ad1af3e5d1b6e9e5fc09c7500e81cb73":"createDocumentType","4095c35abed0bcb3e1cda892fec32644b49ac964c0":"deleteUser","40b9fa9b3cac76fd706f12f630e5a9298b49671d8f":"deleteDocumentType","40c844edda6d17ee9a4f3d7e8a4b4c0fc742612e42":"deleteDepartment","600f8644093915a696d7fc2d7e72282bf6f76fda5f":"updateDocumentType","602997a618703e02fd95695e9eb06855f06887db92":"resetPassword","60731837bf207a5017a04f1cb760de13d1f1a2102d":"updateCategory","60bf3420bc5304d0b0421b4065be5d82320a0050d4":"updateDepartment","60ea8593466882235370d41335458882ad520f9121":"updateDocument","60edcc8aae20a8dcba2b1a649cdd994e48de5fc70d":"updateUser","7c61dbf2cc9a90aa99dee606a85eba5b1bddc989fa":"saveDocumentFile"},"",""] */ __turbopack_context__.s({
    "createCategory": (()=>createCategory),
    "createDepartment": (()=>createDepartment),
    "createDocument": (()=>createDocument),
    "createDocumentType": (()=>createDocumentType),
    "createUser": (()=>createUser),
    "deleteCategory": (()=>deleteCategory),
    "deleteDepartment": (()=>deleteDepartment),
    "deleteDocument": (()=>deleteDocument),
    "deleteDocumentFile": (()=>deleteDocumentFile),
    "deleteDocumentType": (()=>deleteDocumentType),
    "deleteUser": (()=>deleteUser),
    "resetPassword": (()=>resetPassword),
    "saveDocumentFile": (()=>saveDocumentFile),
    "updateCategory": (()=>updateCategory),
    "updateDepartment": (()=>updateDepartment),
    "updateDocument": (()=>updateDocument),
    "updateDocumentType": (()=>updateDocumentType),
    "updateUser": (()=>updateUser)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/server-reference.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$app$2d$render$2f$encryption$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/app-render/encryption.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$postgres$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/postgres/src/index.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$bcrypt__$5b$external$5d$__$28$bcrypt$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/bcrypt [external] (bcrypt, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__ = __turbopack_context__.i("[project]/node_modules/zod/v3/external.js [app-rsc] (ecmascript) <export * as z>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/cache.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/build/webpack/loaders/next-flight-loader/action-validate.js [app-rsc] (ecmascript)");
;
;
;
;
;
;
const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$postgres$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])(process.env.POSTGRES_URL, {
    ssl: 'require'
});
// ============================================================
// USERS
// ============================================================
const UserSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Nama wajib diisi'),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Email tidak valid'),
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(6, 'Password minimal 6 karakter'),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'admin',
        'viewer'
    ])
});
const UpdateUserSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    name: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(1, 'Nama wajib diisi'),
    email: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().email('Email tidak valid'),
    role: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].enum([
        'admin',
        'viewer'
    ])
});
const ResetPasswordSchema = __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].object({
    password: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(6, 'Password minimal 6 karakter'),
    confirmPassword: __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$zod$2f$v3$2f$external$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$export__$2a$__as__z$3e$__["z"].string().min(6, 'Konfirmasi password wajib diisi')
});
async function createUser(formData) {
    const parsed = UserSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        password: formData.get('password'),
        role: formData.get('role')
    });
    if (!parsed.success) return {
        error: parsed.error.errors[0].message
    };
    const { name, email, password, role } = parsed.data;
    try {
        const hashedPassword = await __TURBOPACK__imported__module__$5b$externals$5d2f$bcrypt__$5b$external$5d$__$28$bcrypt$2c$__cjs$29$__["default"].hash(password, 10);
        await sql`INSERT INTO users (name, email, password, role) VALUES (${name}, ${email}, ${hashedPassword}, ${role})`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/users');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Email sudah terdaftar.'
        };
        return {
            error: 'Gagal membuat user.'
        };
    }
}
async function updateUser(id, formData) {
    const parsed = UpdateUserSchema.safeParse({
        name: formData.get('name'),
        email: formData.get('email'),
        role: formData.get('role')
    });
    if (!parsed.success) return {
        error: parsed.error.errors[0].message
    };
    const { name, email, role } = parsed.data;
    try {
        await sql`UPDATE users SET name = ${name}, email = ${email}, role = ${role} WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/users');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Email sudah terdaftar.'
        };
        return {
            error: 'Gagal mengupdate user.'
        };
    }
}
async function resetPassword(id, formData) {
    const parsed = ResetPasswordSchema.safeParse({
        password: formData.get('password'),
        confirmPassword: formData.get('confirmPassword')
    });
    if (!parsed.success) return {
        error: parsed.error.errors[0].message
    };
    const { password, confirmPassword } = parsed.data;
    if (password !== confirmPassword) return {
        error: 'Password tidak cocok.'
    };
    try {
        const hashedPassword = await __TURBOPACK__imported__module__$5b$externals$5d2f$bcrypt__$5b$external$5d$__$28$bcrypt$2c$__cjs$29$__["default"].hash(password, 10);
        await sql`UPDATE users SET password = ${hashedPassword} WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/users');
        return {
            success: true
        };
    } catch  {
        return {
            error: 'Gagal mereset password.'
        };
    }
}
async function deleteUser(id) {
    try {
        await sql`DELETE FROM users WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/users');
        return {
            success: true
        };
    } catch  {
        return {
            error: 'Gagal menghapus user.'
        };
    }
}
async function createCategory(formData) {
    const name = formData.get('name')?.trim();
    if (!name) return {
        error: 'Nama kategori wajib diisi.'
    };
    try {
        await sql`INSERT INTO categories (name) VALUES (${name})`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/categories');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Kategori sudah ada.'
        };
        return {
            error: 'Gagal membuat kategori.'
        };
    }
}
async function updateCategory(id, formData) {
    const name = formData.get('name')?.trim();
    if (!name) return {
        error: 'Nama kategori wajib diisi.'
    };
    try {
        await sql`UPDATE categories SET name = ${name} WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/categories');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Kategori sudah ada.'
        };
        return {
            error: 'Gagal mengupdate kategori.'
        };
    }
}
async function deleteCategory(id) {
    try {
        await sql`DELETE FROM categories WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/categories');
        return {
            success: true
        };
    } catch  {
        return {
            error: 'Gagal menghapus kategori. Pastikan tidak ada jenis dokumen yang menggunakan kategori ini.'
        };
    }
}
async function createDocumentType(formData) {
    const name = formData.get('name')?.trim();
    const category_id = formData.get('category_id');
    if (!name) return {
        error: 'Nama jenis dokumen wajib diisi.'
    };
    if (!category_id) return {
        error: 'Kategori wajib dipilih.'
    };
    try {
        await sql`INSERT INTO document_types (name, category_id) VALUES (${name}, ${category_id})`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/document-types');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Jenis dokumen sudah ada di kategori ini.'
        };
        return {
            error: 'Gagal membuat jenis dokumen.'
        };
    }
}
async function updateDocumentType(id, formData) {
    const name = formData.get('name')?.trim();
    const category_id = formData.get('category_id');
    if (!name) return {
        error: 'Nama jenis dokumen wajib diisi.'
    };
    if (!category_id) return {
        error: 'Kategori wajib dipilih.'
    };
    try {
        await sql`UPDATE document_types SET name = ${name}, category_id = ${category_id} WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/document-types');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Jenis dokumen sudah ada di kategori ini.'
        };
        return {
            error: 'Gagal mengupdate jenis dokumen.'
        };
    }
}
async function deleteDocumentType(id) {
    try {
        await sql`DELETE FROM document_types WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/document-types');
        return {
            success: true
        };
    } catch  {
        return {
            error: 'Gagal menghapus jenis dokumen. Pastikan tidak ada dokumen yang menggunakan jenis ini.'
        };
    }
}
async function createDepartment(formData) {
    const code = formData.get('code')?.trim().toUpperCase();
    const name = formData.get('name')?.trim();
    if (!code) return {
        error: 'Kode departemen wajib diisi.'
    };
    if (!name) return {
        error: 'Nama departemen wajib diisi.'
    };
    try {
        await sql`INSERT INTO departments (code, name) VALUES (${code}, ${name})`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/departments');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Kode departemen sudah ada.'
        };
        return {
            error: 'Gagal membuat departemen.'
        };
    }
}
async function updateDepartment(id, formData) {
    const code = formData.get('code')?.trim().toUpperCase();
    const name = formData.get('name')?.trim();
    if (!code) return {
        error: 'Kode departemen wajib diisi.'
    };
    if (!name) return {
        error: 'Nama departemen wajib diisi.'
    };
    try {
        await sql`UPDATE departments SET code = ${code}, name = ${name} WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/departments');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Kode departemen sudah ada.'
        };
        return {
            error: 'Gagal mengupdate departemen.'
        };
    }
}
async function deleteDepartment(id) {
    try {
        await sql`DELETE FROM departments WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/master/departments');
        return {
            success: true
        };
    } catch  {
        return {
            error: 'Gagal menghapus departemen.'
        };
    }
}
async function createDocument(formData) {
    const doc_number = formData.get('doc_number')?.trim();
    const title = formData.get('title')?.trim();
    const category_id = formData.get('category_id');
    const type_id = formData.get('type_id');
    const department_id = formData.get('department_id') || null;
    const revision = parseInt(formData.get('revision')) || 1;
    const effective_date = formData.get('effective_date');
    const revision_date = formData.get('revision_date') || null;
    const expiry_date = formData.get('expiry_date') || null;
    const uploaded_by = formData.get('uploaded_by');
    if (!doc_number || !title || !category_id || !type_id || !effective_date) {
        return {
            error: 'Field wajib belum lengkap.'
        };
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
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/documents');
        return {
            success: true,
            id: result[0].id
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Nomor dokumen dengan revisi ini sudah ada.'
        };
        return {
            error: 'Gagal membuat dokumen.'
        };
    }
}
async function saveDocumentFile(documentId, fileLabel, fileUrl, fileName, fileType) {
    try {
        await sql`
      INSERT INTO document_files (document_id, file_label, file_url, file_name, file_type)
      VALUES (${documentId}, ${fileLabel}, ${fileUrl}, ${fileName}, ${fileType})
      ON CONFLICT (document_id, file_label) DO UPDATE SET
        file_url = EXCLUDED.file_url,
        file_name = EXCLUDED.file_name,
        file_type = EXCLUDED.file_type
    `;
        return {
            success: true
        };
    } catch  {
        return {
            error: 'Gagal menyimpan file.'
        };
    }
}
async function deleteDocument(id) {
    try {
        await sql`UPDATE documents SET status = 'dihapus', updated_at = NOW() WHERE id = ${id}`;
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/documents');
        return {
            success: true
        };
    } catch  {
        return {
            error: 'Gagal menghapus dokumen.'
        };
    }
}
async function updateDocument(id, formData) {
    const title = formData.get('title')?.trim();
    const doc_number = formData.get('doc_number')?.trim();
    const revision = parseInt(formData.get('revision')) || 1;
    const department_id = formData.get('department_id') || null;
    const effective_date = formData.get('effective_date');
    const revision_date = formData.get('revision_date') || null;
    const expiry_date = formData.get('expiry_date') || null;
    if (!title || !doc_number || !effective_date) {
        return {
            error: 'Field wajib belum lengkap.'
        };
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
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$cache$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["revalidatePath"])('/dashboard/documents');
        return {
            success: true
        };
    } catch (error) {
        if (error?.code === '23505') return {
            error: 'Nomor dokumen dengan revisi ini sudah ada.'
        };
        return {
            error: 'Gagal mengupdate dokumen.'
        };
    }
}
async function deleteDocumentFile(fileId) {
    try {
        await sql`DELETE FROM document_files WHERE id = ${fileId}`;
        return {
            success: true
        };
    } catch  {
        return {
            error: 'Gagal menghapus file.'
        };
    }
}
;
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$action$2d$validate$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["ensureServerEntryExports"])([
    createUser,
    updateUser,
    resetPassword,
    deleteUser,
    createCategory,
    updateCategory,
    deleteCategory,
    createDocumentType,
    updateDocumentType,
    deleteDocumentType,
    createDepartment,
    updateDepartment,
    deleteDepartment,
    createDocument,
    saveDocumentFile,
    deleteDocument,
    updateDocument,
    deleteDocumentFile
]);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createUser, "406495fb26cf5d257b087a256ac2a44b216e8b0add", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateUser, "60edcc8aae20a8dcba2b1a649cdd994e48de5fc70d", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(resetPassword, "602997a618703e02fd95695e9eb06855f06887db92", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteUser, "4095c35abed0bcb3e1cda892fec32644b49ac964c0", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createCategory, "408a3d549f3f6a242bc06a512897fe35984e46a6bb", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateCategory, "60731837bf207a5017a04f1cb760de13d1f1a2102d", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteCategory, "40472c6a82d5ec8851ba817f9169bc2afd792fc9e0", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createDocumentType, "408b22e9c7ad1af3e5d1b6e9e5fc09c7500e81cb73", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateDocumentType, "600f8644093915a696d7fc2d7e72282bf6f76fda5f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteDocumentType, "40b9fa9b3cac76fd706f12f630e5a9298b49671d8f", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createDepartment, "4037b79f60e732ac9b5967d422151b8ca2b9853282", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateDepartment, "60bf3420bc5304d0b0421b4065be5d82320a0050d4", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteDepartment, "40c844edda6d17ee9a4f3d7e8a4b4c0fc742612e42", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(createDocument, "40433427b6e0fbe036ba1fb2c5388102d0696fec88", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(saveDocumentFile, "7c61dbf2cc9a90aa99dee606a85eba5b1bddc989fa", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteDocument, "407c392a5757c05f439d5cbc96ffe51bb0ae555413", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(updateDocument, "60ea8593466882235370d41335458882ad520f9121", null);
(0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$build$2f$webpack$2f$loaders$2f$next$2d$flight$2d$loader$2f$server$2d$reference$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerServerReference"])(deleteDocumentFile, "407227442becece0969aadd24a95f17e15f81ec97a", null);
}}),
"[project]/.next-internal/server/app/dashboard/documents/edit/[id]/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/lib/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <locals>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/actions.ts [app-rsc] (ecmascript)");
;
;
;
}}),
"[project]/.next-internal/server/app/dashboard/documents/edit/[id]/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/lib/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <module evaluation>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({});
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$documents$2f$edit$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/documents/edit/[id]/page/actions.js { ACTIONS_MODULE0 => "[project]/app/lib/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
}}),
"[project]/.next-internal/server/app/dashboard/documents/edit/[id]/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/lib/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript) <exports>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "407227442becece0969aadd24a95f17e15f81ec97a": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["deleteDocumentFile"]),
    "60ea8593466882235370d41335458882ad520f9121": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["updateDocument"]),
    "7c61dbf2cc9a90aa99dee606a85eba5b1bddc989fa": (()=>__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["saveDocumentFile"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/actions.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$documents$2f$edit$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$locals$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/documents/edit/[id]/page/actions.js { ACTIONS_MODULE0 => "[project]/app/lib/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <locals>');
}}),
"[project]/.next-internal/server/app/dashboard/documents/edit/[id]/page/actions.js { ACTIONS_MODULE0 => \"[project]/app/lib/actions.ts [app-rsc] (ecmascript)\" } [app-rsc] (server actions loader, ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "407227442becece0969aadd24a95f17e15f81ec97a": (()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$documents$2f$edit$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__["407227442becece0969aadd24a95f17e15f81ec97a"]),
    "60ea8593466882235370d41335458882ad520f9121": (()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$documents$2f$edit$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__["60ea8593466882235370d41335458882ad520f9121"]),
    "7c61dbf2cc9a90aa99dee606a85eba5b1bddc989fa": (()=>__TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$documents$2f$edit$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__["7c61dbf2cc9a90aa99dee606a85eba5b1bddc989fa"])
});
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$documents$2f$edit$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/documents/edit/[id]/page/actions.js { ACTIONS_MODULE0 => "[project]/app/lib/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <module evaluation>');
var __TURBOPACK__imported__module__$5b$project$5d2f2e$next$2d$internal$2f$server$2f$app$2f$dashboard$2f$documents$2f$edit$2f5b$id$5d2f$page$2f$actions$2e$js__$7b$__ACTIONS_MODULE0__$3d3e$__$225b$project$5d2f$app$2f$lib$2f$actions$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$2922$__$7d$__$5b$app$2d$rsc$5d$__$28$server__actions__loader$2c$__ecmascript$29$__$3c$exports$3e$__ = __turbopack_context__.i('[project]/.next-internal/server/app/dashboard/documents/edit/[id]/page/actions.js { ACTIONS_MODULE0 => "[project]/app/lib/actions.ts [app-rsc] (ecmascript)" } [app-rsc] (server actions loader, ecmascript) <exports>');
}}),
"[project]/app/layout.tsx [app-rsc] (ecmascript, Next.js server component)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/app/layout.tsx [app-rsc] (ecmascript)"));
}}),
"[project]/app/dashboard/layout.tsx [app-rsc] (ecmascript, Next.js server component)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/app/dashboard/layout.tsx [app-rsc] (ecmascript)"));
}}),
"[project]/app/lib/data.ts [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "getCategories": (()=>getCategories),
    "getDepartments": (()=>getDepartments),
    "getDocumentById": (()=>getDocumentById),
    "getDocumentTypes": (()=>getDocumentTypes),
    "getDocumentsByCategory": (()=>getDocumentsByCategory),
    "getUsers": (()=>getUsers)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$postgres$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/postgres/src/index.js [app-rsc] (ecmascript)");
;
const sql = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$postgres$2f$src$2f$index$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"])(process.env.POSTGRES_URL, {
    ssl: 'require'
});
async function getUsers() {
    const users = await sql`
    SELECT id, name, email, role, created_at
    FROM users
    ORDER BY created_at DESC
  `;
    return users;
}
async function getCategories() {
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
async function getDocumentTypes() {
    const types = await sql`
    SELECT dt.id, dt.name, dt.created_at,
      dt.category_id, c.name AS category_name
    FROM document_types dt
    JOIN categories c ON c.id = dt.category_id
    ORDER BY c.name ASC, dt.name ASC
  `;
    return types;
}
async function getDepartments() {
    const departments = await sql`
    SELECT id, code, name
    FROM departments
    ORDER BY code ASC
  `;
    return departments;
}
async function getDocumentsByCategory(categoryId) {
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
    const documentsWithFiles = await Promise.all(documents.map(async (doc)=>{
        const files = await sql`
        SELECT id, file_label, file_url, file_name, file_type
        FROM document_files
        WHERE document_id = ${doc.id}
      `;
        return {
            ...doc,
            files
        };
    }));
    return documentsWithFiles;
}
async function getDocumentById(id) {
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
    return {
        ...doc[0],
        files
    };
}
}}),
"[project]/app/ui/document-edit-form.tsx (client reference/proxy) <module evaluation>": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2d$edge$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server-edge.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2d$edge$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/app/ui/document-edit-form.tsx <module evaluation> from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/app/ui/document-edit-form.tsx <module evaluation>", "default");
}}),
"[project]/app/ui/document-edit-form.tsx (client reference/proxy)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>__TURBOPACK__default__export__)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2d$edge$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-server-dom-turbopack-server-edge.js [app-rsc] (ecmascript)");
;
const __TURBOPACK__default__export__ = (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$server$2d$dom$2d$turbopack$2d$server$2d$edge$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["registerClientReference"])(function() {
    throw new Error("Attempted to call the default export of [project]/app/ui/document-edit-form.tsx from the server, but it's on the client. It's not possible to invoke a client function from the server, it can only be rendered as a Component or passed to props of a Client Component.");
}, "[project]/app/ui/document-edit-form.tsx", "default");
}}),
"[project]/app/ui/document-edit-form.tsx [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$ui$2f$document$2d$edit$2d$form$2e$tsx__$28$client__reference$2f$proxy$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/app/ui/document-edit-form.tsx (client reference/proxy) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$ui$2f$document$2d$edit$2d$form$2e$tsx__$28$client__reference$2f$proxy$29$__ = __turbopack_context__.i("[project]/app/ui/document-edit-form.tsx (client reference/proxy)");
;
__turbopack_context__.n(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$ui$2f$document$2d$edit$2d$form$2e$tsx__$28$client__reference$2f$proxy$29$__);
}}),
"[project]/app/dashboard/documents/edit/[id]/page.tsx [app-rsc] (ecmascript)": ((__turbopack_context__) => {
"use strict";

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.s({
    "default": (()=>EditDocumentPage)
});
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/server/route-modules/app-page/vendored/rsc/react-jsx-dev-runtime.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/auth.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$api$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__$3c$module__evaluation$3e$__ = __turbopack_context__.i("[project]/node_modules/next/dist/api/navigation.react-server.js [app-rsc] (ecmascript) <module evaluation>");
var __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/node_modules/next/dist/client/components/navigation.react-server.js [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/lib/data.ts [app-rsc] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$ui$2f$document$2d$edit$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/app/ui/document-edit-form.tsx [app-rsc] (ecmascript)");
;
;
;
;
;
async function EditDocumentPage({ params }) {
    const session = await (0, __TURBOPACK__imported__module__$5b$project$5d2f$auth$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["auth"])();
    if (session?.user?.role !== 'admin') (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/dashboard');
    const [document, categories, documentTypes, departments] = await Promise.all([
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDocumentById"])(params.id),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getCategories"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDocumentTypes"])(),
        (0, __TURBOPACK__imported__module__$5b$project$5d2f$app$2f$lib$2f$data$2e$ts__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["getDepartments"])()
    ]);
    if (!document) (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$client$2f$components$2f$navigation$2e$react$2d$server$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["redirect"])('/dashboard/documents');
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
        className: "max-w-3xl mx-auto",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("div", {
                className: "mb-8",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("h1", {
                        className: "text-2xl font-bold text-slate-800",
                        children: "Edit Dokumen"
                    }, void 0, false, {
                        fileName: "[project]/app/dashboard/documents/edit/[id]/page.tsx",
                        lineNumber: 22,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("p", {
                        className: "text-sm text-slate-400 mt-1",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])("span", {
                                className: "font-mono font-bold text-slate-600",
                                children: document.doc_number
                            }, void 0, false, {
                                fileName: "[project]/app/dashboard/documents/edit/[id]/page.tsx",
                                lineNumber: 24,
                                columnNumber: 11
                            }, this),
                            ' ',
                            "— ",
                            document.title
                        ]
                    }, void 0, true, {
                        fileName: "[project]/app/dashboard/documents/edit/[id]/page.tsx",
                        lineNumber: 23,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/app/dashboard/documents/edit/[id]/page.tsx",
                lineNumber: 21,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$project$5d2f$node_modules$2f$next$2f$dist$2f$server$2f$route$2d$modules$2f$app$2d$page$2f$vendored$2f$rsc$2f$react$2d$jsx$2d$dev$2d$runtime$2e$js__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$app$2f$ui$2f$document$2d$edit$2d$form$2e$tsx__$5b$app$2d$rsc$5d$__$28$ecmascript$29$__["default"], {
                document: document,
                categories: categories,
                documentTypes: documentTypes,
                departments: departments,
                userId: session?.user?.id
            }, void 0, false, {
                fileName: "[project]/app/dashboard/documents/edit/[id]/page.tsx",
                lineNumber: 28,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/app/dashboard/documents/edit/[id]/page.tsx",
        lineNumber: 20,
        columnNumber: 5
    }, this);
}
}}),
"[project]/app/dashboard/documents/edit/[id]/page.tsx [app-rsc] (ecmascript, Next.js server component)": ((__turbopack_context__) => {

var { g: global, __dirname } = __turbopack_context__;
{
__turbopack_context__.n(__turbopack_context__.i("[project]/app/dashboard/documents/edit/[id]/page.tsx [app-rsc] (ecmascript)"));
}}),

};

//# sourceMappingURL=_179b381c._.js.map