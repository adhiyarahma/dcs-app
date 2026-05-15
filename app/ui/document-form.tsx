'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createDocument, saveDocumentFile } from '@/app/lib/actions';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon } from '@heroicons/react/24/outline';
import { Toast } from '@/app/ui/toast';
import { Toast } from '@/app/ui/toast';
import clsx from 'clsx';

type Category = { id: string; name: string };
type DocumentType = { id: string; name: string; category_id: string; category_name: string };
type Department = { id: string; code: string; name: string };

type FileUpload = {
  label: string;
  displayLabel: string;
  required: boolean;
  file: File | null;
  uploading: boolean;
  url: string | null;
};

function slugify(text: string) {
  return text
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

function getFileFields(categoryName: string): Omit<FileUpload, 'file' | 'uploading' | 'url'>[] {
  const name = categoryName.toLowerCase();
  if (name.includes('msds')) {
    return [
      { label: 'indonesia', displayLabel: 'File Indonesia', required: false },
      { label: 'inggris', displayLabel: 'File Inggris', required: false },
    ];
  }
  return [
    { label: 'word', displayLabel: 'File Word', required: false },
    { label: 'pdf', displayLabel: 'File PDF', required: false },
  ];
}

function getCategoryFields(categoryName: string, typeName?: string) {
  const name = categoryName.toLowerCase();
  const type = typeName?.toLowerCase() ?? '';
  return {
    showDepartment: !name.includes('msds'),
    showRevisionDate: name.includes('msds') && type.includes('kimia'),
    showExpiryDate: name.includes('msds'),
  };
}

function FileUploadField({ field, onChange }: { field: FileUpload; onChange: (file: File | null) => void }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
        {field.displayLabel}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.file ? (
        <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <DocumentIcon className="w-5 h-5 text-blue-500 shrink-0" />
          <span className="text-sm text-slate-700 font-medium truncate flex-1">{field.file.name}</span>
          <button type="button" onClick={() => onChange(null)}
            className="p-1 hover:bg-blue-100 rounded-lg transition-all">
            <XMarkIcon className="w-4 h-4 text-slate-400" />
          </button>
        </div>
      ) : (
        <label className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
          <CloudArrowUpIcon className="w-7 h-7 text-slate-300" />
          <span className="text-sm text-slate-400">Klik untuk upload file</span>
          <span className="text-xs text-slate-300">PDF, Word, Excel</span>
          <input type="file" className="hidden"
            accept=".pdf,.doc,.docx,.xls,.xlsx"
            onChange={(e) => onChange(e.target.files?.[0] ?? null)} />
        </label>
      )}
    </div>
  );
}

export default function DocumentForm({
  categories, documentTypes, departments, userId,
}: {
  categories: Category[];
  documentTypes: DocumentType[];
  departments: Department[];
  userId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [error, setError] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedType, setSelectedType] = useState<DocumentType | null>(null);
  const [filteredTypes, setFilteredTypes] = useState<DocumentType[]>([]);
  const [fileFields, setFileFields] = useState<FileUpload[]>([]);
  const [categoryFields, setCategoryFields] = useState({
    showDepartment: false,
    showRevisionDate: false,
    showExpiryDate: false,
  });

  useEffect(() => {
    if (!selectedCategoryId) {
      setFilteredTypes([]);
      setFileFields([]);
      setSelectedCategory(null);
      setSelectedType(null);
      return;
    }
    const cat = categories.find(c => c.id === selectedCategoryId) ?? null;
    setSelectedCategory(cat);
    setFilteredTypes(documentTypes.filter(t => t.category_id === selectedCategoryId));
    setSelectedTypeId('');
    setSelectedType(null);
    if (cat) {
      const fields = getFileFields(cat.name);
      setFileFields(fields.map(f => ({ ...f, file: null, uploading: false, url: null })));
      setCategoryFields(getCategoryFields(cat.name));
    }
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategory || !selectedTypeId) return;
    const type = filteredTypes.find(t => t.id === selectedTypeId) ?? null;
    setSelectedType(type);
    setCategoryFields(getCategoryFields(selectedCategory.name, type?.name));
  }, [selectedTypeId]);

  function updateFile(index: number, file: File | null) {
    setFileFields(prev => prev.map((f, i) => i === index ? { ...f, file, url: null } : f));
  }

  async function uploadFile(
    file: File,
    docNumber: string,
    label: string,
    categoryName: string,
    typeName: string,
    revision?: number
  ): Promise<string> {
    const ext = file.name.split('.').pop();
    const categorySlug = slugify(categoryName);
    const typeSlug = slugify(typeName);
    const safeDocNumber = docNumber.replace(/\//g, '-').replace(/\s+/g, '_');
    const revStr = String(revision ?? 0).padStart(2, '0');
    // Struktur: category/type/doc_number/rev-XX/label-timestamp.ext
    const path = `${categorySlug}/${typeSlug}/${safeDocNumber}/rev-${revStr}/${label}-${Date.now()}.${ext}`;

    const fd = new FormData();
    fd.append('file', file);
    fd.append('path', path);

    const res = await fetch('/api/upload', { method: 'POST', body: fd });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error ?? 'Upload gagal.');
    return data.url;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError('');

    const formData = new FormData(e.currentTarget);
    formData.set('uploaded_by', userId);

    try {
      const result = await createDocument(formData);
      if (result?.error) {
        setError(result.error);
        setLoading(false);
        return;
      }

      const documentId = result.id as string;
      const docNumber = formData.get('doc_number') as string;

      for (const field of fileFields) {
        if (!field.file) continue;
        const revisionNum = parseInt(formData.get('revision') as string) || 0;
        const url = await uploadFile(
          field.file,
          docNumber,
          field.label,
          selectedCategory?.name ?? 'uncategorized',
          selectedType?.name ?? 'unknown',
          revisionNum
        );
        const ext = field.file.name.split('.').pop() ?? 'pdf';
        await saveDocumentFile(documentId, field.label, url, field.file.name, ext);
      }

      setToast({ message: 'Dokumen berhasil disimpan!', type: 'success' });
      setTimeout(() => router.push('/dashboard/documents'), 1800);
    } catch (err: any) {
      setError(err.message ?? 'Terjadi kesalahan.');
      setToast({ message: err.message ?? 'Gagal menyimpan dokumen.', type: 'error' });
      setToast({ message: err.message ?? 'Gagal menyimpan dokumen.', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {toast && <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />}
      <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>
      )}

      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Informasi Dokumen</h2>
        <div className="grid grid-cols-2 gap-4">

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Kategori <span className="text-red-500">*</span>
            </label>
            <select name="category_id" required
              value={selectedCategoryId}
              onChange={(e) => setSelectedCategoryId(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white">
              <option value="">Pilih kategori...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Jenis Dokumen <span className="text-red-500">*</span>
            </label>
            <select name="type_id" required
              value={selectedTypeId}
              onChange={(e) => setSelectedTypeId(e.target.value)}
              disabled={!selectedCategoryId}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white disabled:opacity-50">
              <option value="">Pilih jenis...</option>
              {filteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Judul Dokumen <span className="text-red-500">*</span>
            </label>
            <input name="title" required placeholder="Masukkan judul dokumen"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              No. Dokumen <span className="text-red-500">*</span>
            </label>
            <input name="doc_number" required placeholder="contoh: IEM-SP-IQD-001"
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Revisi <span className="text-red-500">*</span>
            </label>
            <input name="revision" type="number" required min={1} defaultValue={1}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>

          {categoryFields.showDepartment && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                PIC / Bagian
              </label>
              <select name="department_id"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white">
                <option value="">Pilih departemen...</option>
                {departments.map(d => (
                  <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Tgl Efektif <span className="text-red-500">*</span>
            </label>
            <input name="effective_date" type="date" required
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>

          {categoryFields.showRevisionDate && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Tgl Revisi
              </label>
              <input name="revision_date" type="date"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
            </div>
          )}

          {categoryFields.showExpiryDate && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Masa Berlaku
              </label>
              <input name="expiry_date" type="date"
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
            </div>
          )}
        </div>
      </div>

      {fileFields.length > 0 && (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Upload File</h2>
          <div className={clsx('grid gap-4', fileFields.length > 1 ? 'grid-cols-2' : 'grid-cols-1')}>
            {fileFields.map((field, i) => (
              <FileUploadField key={field.label} field={field} onChange={(file) => updateFile(i, file)} />
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3 justify-end pb-8">
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
          Batal
        </button>
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">
          {loading ? 'Menyimpan...' : 'Simpan Dokumen'}
        </button>
      </div>
    </form>
    </>
  );
}
