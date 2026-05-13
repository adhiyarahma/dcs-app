'use client';

import LoginForm from '@/app/ui/login-form';
import { FileText } from 'lucide-react';
import { motion } from 'framer-motion';

export default function LoginPage() {
  return (
    <main className="flex items-center justify-center min-h-screen bg-[#F8FAFC]">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md px-6"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="bg-slate-900 p-3 rounded-2xl shadow-lg mb-4">
            <FileText className="text-white w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            DCS <span className="text-blue-600">Portal</span>
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Silakan masuk dengan akun internal Anda
          </p>
        </div>

        <LoginForm />

        <p className="text-center mt-8 text-xs text-slate-400">
          Masalah akses? Hubungi Admin Web
        </p>
      </motion.div>
    </main>
  );
}