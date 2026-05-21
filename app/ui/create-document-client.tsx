'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createDocument } from '@/app/lib/actions';

type Category = { id: string; name: string };
type Department = { id: string; code: string; name: string };
type DocType = { id: string; name: string; category_id: string };

interface Props {
  categories: Category[];
  departments: Department[];
  documentTypes: DocType[];
  userId: string;
}

export default function CreateDocumentClient({
  categories,
  departments,
  documentTypes,
  userId,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('');

  const filteredTypes = documentTypes.filter(t => t.category_id === selectedCategory);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await createDocument(formData);
      if (result?.error) {
        setError(result.error);
        return;
      }
      router.push('/dashboard/documents');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <input type="hidden" name="uploaded_by" value={userId} />

      {/* No. Dokumen & Revisi */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            No. Dokumen <span className="text-red-500">*</span>
          </label>
          <input
            name="doc_number"
            required
            placeholder="contoh: QP-001"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Revisi <span className="text-red-500">*</span>
          </label>
          <input
            name="revision"
            type="number"
            min={0}
            max={8}
            defaultValue={0}
            required
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      {/* Judul */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Judul Dokumen <span className="text-red-500">*</span>
        </label>
        <input
          name="title"
          required
          placeholder="Judul lengkap dokumen"
          className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
        />
      </div>

      {/* Kategori & Jenis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Kategori <span className="text-red-500">*</span>
          </label>
          <select
            name="category_id"
            required
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
          >
            <option value="">Pilih Kategori</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Jenis Dokumen <span className="text-red-500">*</span>
          </label>
          <select
            name="type_id"
            required
            disabled={!selectedCategory}
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white disabled:bg-slate-50 disabled:text-slate-400"
          >
            <option value="">Pilih Jenis</option>
            {filteredTypes.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Departemen */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Departemen
        </label>
        <select
          name="department_id"
          className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
        >
          <option value="">Tidak ada</option>
          {departments.map(d => (
            <option key={d.id} value={d.id}>[{d.code}] {d.name}</option>
          ))}
        </select>
      </div>

      {/* Tanggal */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tgl Efektif <span className="text-red-500">*</span>
          </label>
          <input
            name="effective_date"
            type="date"
            required
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tgl Revisi
          </label>
          <input
            name="revision_date"
            type="date"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tgl Kadaluarsa
          </label>
          <input
            name="expiry_date"
            type="date"
            className="w-full border border-slate-300 rounded-lg px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
          />
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <a
          href="/dashboard/documents"
          className="text-sm text-slate-400 hover:text-slate-600 transition-colors"
        >
          ← Batal
        </a>
        <button
          type="submit"
          disabled={isPending}
          className="px-5 py-2.5 text-sm font-bold bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-all"
        >
          {isPending ? 'Menyimpan...' : 'Simpan Dokumen'}
        </button>
      </div>
    </form>
  );
}
