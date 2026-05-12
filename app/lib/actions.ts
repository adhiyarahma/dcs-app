'use server';

import postgres from 'postgres';
import bcrypt from 'bcrypt';
import { z } from 'zod';
import { revalidatePath } from 'next/cache';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

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

export async function createUser(formData: FormData) {
  const parsed = UserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, email, password, role } = parsed.data;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    await sql`
      INSERT INTO users (name, email, password, role)
      VALUES (${name}, ${email}, ${hashedPassword}, ${role})
    `;
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') {
      return { error: 'Email sudah terdaftar.' };
    }
    return { error: 'Gagal membuat user.' };
  }
}

export async function updateUser(id: string, formData: FormData) {
  const parsed = UpdateUserSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    role: formData.get('role'),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { name, email, role } = parsed.data;

  try {
    await sql`
      UPDATE users
      SET name = ${name}, email = ${email}, role = ${role}
      WHERE id = ${id}
    `;
    revalidatePath('/dashboard/users');
    return { success: true };
  } catch (error: any) {
    if (error?.code === '23505') {
      return { error: 'Email sudah terdaftar.' };
    }
    return { error: 'Gagal mengupdate user.' };
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
