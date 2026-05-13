'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  FileText, 
  LogIn, 
  ShieldCheck, 
  Search, 
  History 
} from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans selection:bg-blue-100">
      
      {/* Container Utama */}
      <main className="max-w-6xl mx-auto px-6 min-h-screen flex flex-col justify-center">
        
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          
          {/* Sisi Kiri: Informasi Sistem */}
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-8"
          >
            <div className="flex items-center gap-3">
              <div className="bg-slate-900 p-2.5 rounded-xl shadow-lg">
                <FileText className="text-white w-7 h-7" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-800">
                DCS<span className="text-blue-600">  Internal</span>
              </span>
            </div>

            <div className="space-y-4">
              <h1 className="text-4xl lg:text-5xl font-semibold text-slate-900 leading-tight">
                Document Control System
              </h1>
              <p className="text-lg text-slate-500 leading-relaxed max-w-md">
                Platform pusat untuk pengelolaan, pengarsipan, dan pelacakan dokumen resmi perusahaan secara terintegrasi dan aman.
              </p>
            </div>

            {/* List Fungsionalitas (Bukan jualan, tapi instruksi/info) */}
            <div className="grid gap-4 pt-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600"><Search size={20}/></div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">Pencarian Terpusat</h3>
                  <p className="text-xs text-slate-500">Akses cepat ke seluruh SOP dan dokumen teknis.</p>
                </div>
              </div>
              <div className="flex items-start gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600"><History size={20}/></div>
                <div>
                  <h3 className="font-semibold text-sm text-slate-800">Riwayat Revisi</h3>
                  <p className="text-xs text-slate-500">Monitoring perubahan versi dokumen secara realtime.</p>
                </div>
              </div>
            </div>

            <div className="pt-4">
              <Link 
                href="/login" 
                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-medium rounded-xl hover:bg-blue-600 transition-all shadow-md group"
              >
                Log In
                <LogIn size={18} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
          </motion.div>

          {/* Sisi Kanan: Visual Minimalis */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="hidden lg:block relative"
          >
            {/* Dekorasi Latar Belakang */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-blue-50 rounded-full blur-3xl opacity-60 -z-10" />
            
            <div className="bg-white rounded-[2.5rem] p-4 shadow-2xl border border-slate-200">
              <div className="bg-slate-50 rounded-[1.8rem] border border-dashed border-slate-300 aspect-square flex flex-col items-center justify-center p-12 text-center">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-200 blur-2xl opacity-40 animate-pulse" />
                  <ShieldCheck size={80} className="relative text-slate-300" strokeWidth={1} />
                </div>
                <h4 className="text-slate-400 font-medium text-sm uppercase tracking-[0.2em]">Authorized Personnel Only</h4>
                <div className="mt-6 flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                  <div className="w-2 h-2 rounded-full bg-slate-200" />
                </div>
              </div>
            </div>
          </motion.div>

        </div>

        {/* Footer Kecil */}
        <footer className="mt-20 pt-8 border-t border-slate-200">
          <p className="text-xs text-slate-400">
            © {new Date().getFullYear()} Adhiya — Internal Document Control System.
          </p>
        </footer>

      </main>
    </div>
  );
}