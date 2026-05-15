'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateDocumentOnly, createDocumentRevision, saveDocumentFile, deleteDocumentFile } from '@/app/lib/actions';
import { CloudArrowUpIcon, XMarkIcon, DocumentIcon, TrashIcon, ArrowDownTrayIcon } from '@heroicons/react/24/outline';
import { Toast } from '@/app/ui/toast';
import clsx from 'clsx';

type Department = { id: string; code: string; name: string };
type Category = { id: string; name: string };
type DocumentType = { id: string; name: string; category_id: string; category_name: string };
type ExistingFile = { id: string; file_label: string; file_url: string; file_name: string; file_type: string };

type Document = {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
  effective_date: string;
  revision_date: string | null;
  expiry_date: string | null;
  status: string;
  category_id: string;
  type_id: string;
  department_id: string | null;
  type_name: string;
  department_code: string | null;
  files: ExistingFile[];
};

function slugify(text: string) {
  return text.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-');
}

function getFileLabels(categoryName: string) {
  const name = categoryName.toLowerCase();
  if (name.includes('msds')) return ['indonesia', 'inggris'];
  return ['word', 'pdf'];
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

export default function DocumentEditForm({
  document, categories, documentTypes, departments, userId,
}: {
  document: Document;
  categories: Category[];
  documentTypes: DocumentType[];
  departments: Department[];
  userId: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRevisionModal, setShowRevisionModal] = useState(false);
  const [pendingFormData, setPendingFormData] = useState<FormData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const category = categories.find(c => c.id === document.category_id);
  const docType = documentTypes.find(t => t.id === document.type_id);
  const categoryFields = getCategoryFields(category?.name ?? '', docType?.name);
  const fileLabels = getFileLabels(category?.name ?? '');

  // State untuk file yang sudah ada
  const [existingFiles, setExistingFiles] = useState<ExistingFile[]>(document.files ?? []);

  // State untuk file baru yang akan di-upload (per label)
  const [newFiles, setNewFiles] = useState<Record<string, File | null>>(
    Object.fromEntries(fileLabels.map(l => [l, null]))
  );

  function getExistingFile(label: string) {
    return existingFiles.find(f => f.file_label === label) ?? null;
  }

  async function handleRemoveExistingFile(file: ExistingFile) {
    const result = await deleteDocumentFile(file.id);
    if (result?.error) {
      setError(result.error);
    } else {
      setExistingFiles(prev => prev.filter(f => f.id !== file.id));
    }
  }

  async function uploadFile(file: File, docNumber: string, label: string, revision?: number): Promise<string> {
    const ext = file.name.split('.').pop();
    const categorySlug = slugify(category?.name ?? 'uncategorized');
    const typeSlug = slugify(docType?.name ?? 'unknown');
    const safeDocNumber = docNumber.replace(/\//g, '-').replace(/\s+/g, '_');
    const revStr = String(revision ?? 0).padStart(2, '0');
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
    const formData = new FormData(e.currentTarget);
    setPendingFormData(formData);
    setShowRevisionModal(true);
  }

  async function handleSaveChoice(mode: 'update_only' | 'new_revision') {
    setShowRevisionModal(false);
    setLoading(true);
    setError('');
    const formData = pendingFormData;
    formData.set('uploaded_by', userId);

    try {
      if (mode === 'update_only') {
        const result = await updateDocumentOnly(document.id, formData);
        if (result?.error) { setError(result.error); setLoading(false); return; }

        const docNumber = formData.get('doc_number') as string;
        for (const [label, file] of Object.entries(newFiles)) {
          const oldFile = getExistingFile(label);
          if (oldFile) await deleteDocumentFile(oldFile.id);
          const url = await uploadFile(file, docNumber, label, document.revision);
          const ext = file.name.split('.').pop() ?? 'pdf';
          await saveDocumentFile(document.id, label, url, file.name, ext);
        }
        setToast({ message: 'Dokumen berhasil diperbarui!', type: 'success' });
        setTimeout(() => router.push('/dashboard/documents'), 1800);

      } else {
        const result = await createDocumentRevision(document.id, formData);
        if (result?.error) { setError(result.error); setLoading(false); return; }

        const newDocId = result.id as string;
        const docNumber = formData.get('doc_number') as string;
        const newRevision = parseInt(formData.get('revision') as string) || document.revision;

        for (const [label, file] of Object.entries(newFiles)) {
          const url = await uploadFile(file, docNumber, label, newRevision);
          const ext = file.name.split('.').pop() ?? 'pdf';
          await saveDocumentFile(newDocId, label, url, file.name, ext);
        }
        setToast({ message: 'Revisi baru berhasil dibuat!', type: 'success' });
        setTimeout(() => router.push('/dashboard/documents'), 1800);
      }
    } catch (err: any) {
      setError(err.message ?? 'Terjadi kesalahan.');
      setToast({ message: err.message ?? 'Gagal menyimpan.', type: 'error' });
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

      {/* Info kategori & jenis — readonly */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex gap-6">
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Kategori</p>
          <p className="text-sm font-bold text-slate-700">{category?.name ?? '—'}</p>
        </div>
        <div className="w-px bg-slate-200" />
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1">Jenis Dokumen</p>
          <p className="text-sm font-bold text-slate-700">{docType?.name ?? '—'}</p>
        </div>
        <div className="ml-auto flex items-center">
          <span className="text-xs text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
            Tidak dapat diubah
          </span>
        </div>
      </div>

      {/* Card: Informasi Dokumen */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Informasi Dokumen</h2>
        <div className="grid grid-cols-2 gap-4">

          <div className="col-span-2">
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Judul Dokumen <span className="text-red-500">*</span>
            </label>
            <input name="title" required defaultValue={document.title}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              No. Dokumen <span className="text-red-500">*</span>
            </label>
            <input name="doc_number" required defaultValue={document.doc_number}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
              Revisi <span className="text-red-500">*</span>
            </label>
            <input name="revision" type="number" required min={1} defaultValue={document.revision}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>

          {categoryFields.showDepartment && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                PIC / Bagian
              </label>
              <select name="department_id" defaultValue={document.department_id ?? ''}
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
              defaultValue={document.effective_date?.slice(0, 10)}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
          </div>

          {categoryFields.showRevisionDate && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Tgl Revisi
              </label>
              <input name="revision_date" type="date"
                defaultValue={document.revision_date?.slice(0, 10) ?? ''}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
            </div>
          )}

          {categoryFields.showExpiryDate && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Masa Berlaku
              </label>
              <input name="expiry_date" type="date"
                defaultValue={document.expiry_date?.slice(0, 10) ?? ''}
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all" />
            </div>
          )}
        </div>
      </div>

      {/* Card: File */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">File Dokumen</h2>
        <div className="grid grid-cols-2 gap-4">
          {fileLabels.map((label) => {
            const existing = getExistingFile(label);
            const newFile = newFiles[label];
            const displayLabel = label.charAt(0).toUpperCase() + label.slice(1);

            return (
              <div key={label}>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  File {displayLabel}
                </label>

                {/* File yang sudah ada */}
                {existing && !newFile && (
                  <div className="mb-2 flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
                    <DocumentIcon className="w-4 h-4 text-green-600 shrink-0" />
                    <span className="text-xs text-slate-700 font-medium truncate flex-1">{existing.file_name}</span>
                    <a href={existing.file_url} target="_blank" rel="noopener noreferrer"
                      className="p-1 hover:bg-green-100 rounded-lg transition-all">
                      <ArrowDownTrayIcon className="w-4 h-4 text-green-600" />
                    </a>
                    <button type="button" onClick={() => handleRemoveExistingFile(existing)}
                      className="p-1 hover:bg-red-100 rounded-lg transition-all">
                      <TrashIcon className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                )}

                {/* Upload file baru */}
                {newFile ? (
                  <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <DocumentIcon className="w-5 h-5 text-blue-500 shrink-0" />
                    <span className="text-sm text-slate-700 font-medium truncate flex-1">{newFile.name}</span>
                    <button type="button"
                      onClick={() => setNewFiles(prev => ({ ...prev, [label]: null }))}
                      className="p-1 hover:bg-blue-100 rounded-lg transition-all">
                      <XMarkIcon className="w-4 h-4 text-slate-400" />
                    </button>
                  </div>
                ) : (
                  <label className={clsx(
                    'flex flex-col items-center justify-center gap-2 p-5 border-2 border-dashed rounded-xl cursor-pointer transition-all',
                    existing
                      ? 'border-slate-200 hover:border-amber-400 hover:bg-amber-50/50'
                      : 'border-slate-200 hover:border-blue-400 hover:bg-blue-50/50'
                  )}>
                    <CloudArrowUpIcon className="w-6 h-6 text-slate-300" />
                    <span className="text-xs text-slate-400">
                      {existing ? 'Replace file' : 'Upload file'}
                    </span>
                    <input type="file" className="hidden"
                      accept=".pdf,.doc,.docx,.xls,.xlsx"
                      onChange={(e) => setNewFiles(prev => ({
                        ...prev,
                        [label]: e.target.files?.[0] ?? null
                      }))} />
                  </label>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 justify-end pb-8">
        <button type="button" onClick={() => router.back()}
          className="px-6 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all">
          Batal
        </button>
        <button type="submit" disabled={loading}
          className="px-6 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all active:scale-95">
          {loading ? 'Menyimpan...' : 'Update Dokumen'}
        </button>
      </div>
    </form>
  );
}
