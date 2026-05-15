import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { authConfig } from './auth.config';
import { z } from 'zod';
import bcrypt from 'bcrypt';
import type { User } from '@/app/lib/definitions';
import { supabaseAdmin } from '@/app/lib/supabase';

async function getUser(email: string): Promise<User | undefined> {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !data) return undefined;
    return data as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}

export const { auth, signIn, signOut, handlers } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        const parsed = z
          .object({ email: z.string().email(), password: z.string().min(6) })
          .safeParse(credentials);

        if (parsed.success) {
          const { email, password } = parsed.data;
          const user = await getUser(email);
          if (!user) return null;
          const match = await bcrypt.compare(password, user.password);
          if (match) return user;
        }
        return null;
      },
    }),
  ],
});
