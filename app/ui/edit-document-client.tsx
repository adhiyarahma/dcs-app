'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { correctDocument, reviseDocument } from '@/app/lib/actions';

interface Document {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
  status: string;
  category_id: string;
  category_name: string;
  type_id: string;
  type_name: string;
  department_id: string | null;
  department_code: string;
  department_name: string;
  effective_date: string;
  revision_date: string | null;
  expiry_date: string | null;
  production_type: string | null; // ← TAMBAHAN
  uploaded_by: string;
  parent_id: string | null;
}

interface DocumentType {
  id: string;
  name: string;
  category_id: string;
}

interface Department {
  id: string;
  code: string;
  name: string;
}

interface Props {
  document: Document;
  documentTypes: DocumentType[];
  departments: Department[];
  userId: string;
}

type EditMode = null | 'koreksi' | 'revisi';

const PRODUCTION_TYPE_OPTIONS = [
  { value: 'production', label: 'Production' },
  { value: 'non-production', label: 'Non-Production' },
  { value: 'production bahan baku', label: 'Production Bahan Baku' },
] as const;

// ─── Helper: tentukan field apa saja yang tampil ─────────────
function getFieldConfig(categoryName: string, typeName: string) {
  const isMSDS = categoryName.toLowerCase().includes('msds');
  const isMSDSKimia = isMSDS && typeName.toLowerCase().includes('kimia');
  const isMSDSBenang = isMSDS && typeName.toLowerCase().includes('benang');

  return {
    showDepartment: !isMSDS,
    showRevisionDate: isMSDSKimia,
    showExpiryDate: isMSDSKimia || isMSDSBenang,
    showProductionType: isMSDSKimia, // ← TAMBAHAN
  };
}

// ─── Komponen utama ───────────────────────────────────────────
export default function EditDocumentClient({ document, documentTypes, departments, userId }: Props) {
  const [editMode, setEditMode] = useState<EditMode>(null);

  return (
    <div>
      {editMode === null && (
        <EditModeSelector document={document} onSelect={setEditMode} />
      )}
      {editMode === 'koreksi' && (
        <EditForm document={document} documentTypes={documentTypes} departments={departments}
          userId={userId} mode="koreksi" onBack={() => setEditMode(null)} />
      )}
      {editMode === 'revisi' && (
        <EditForm document={document} documentTypes={documentTypes} departments={departments}
          userId={userId} mode="revisi" onBack={() => setEditMode(null)} />
      )}
    </div>
  );
}

// ─── Step 1: Pilih jenis edit ─────────────────────────────────
function EditModeSelector({ document, onSelect }: { document: Document; onSelect: (mode: EditMode) => void }) {
  const MAX_REVISION = 8;
  const nextRevision = document.revision >= MAX_REVISION ? 0 : document.revision + 1;

  return (
    <div className="space-y-4">
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-6">
        <p className="text-xs text-slate-400 uppercase tracking-wide font-medium mb-1">Dokumen yang akan diedit</p>
        <p className="font-semibold text-slate-800">{document.title}</p>
        <p className="text-sm text-slate-500 mt-0.5">
          {document.doc_number} &nbsp;·&nbsp; Rev {String(document.revision).padStart(2, '0')} &nbsp;·&nbsp; {document.type_name}
        </p>
      </div>

      <p className="text-sm font-medium text-slate-700 mb-3">Pilih jenis perubahan yang ingin dilakukan:</p>

      <button onClick={() => onSelect('koreksi')}
        className="w-full text-left border-2 border-slate-200 hover:border-blue-400 hover:bg-blue-50 rounded-xl p-5 transition-all group">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800 group-hover:text-blue-700">Koreksi Penulisan</p>
            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
              Salah ketik, typo, atau kesalahan input. Data akan langsung diperbarui. Nomor revisi tidak berubah.
            </p>
            <p className="text-xs text-blue-600 font-medium mt-2 group-hover:text-blue-700">
              Rev {String(document.revision).padStart(2, '0')} → tetap Rev {String(document.revision).padStart(2, '0')}
            </p>
          </div>
        </div>
      </button>

      <button onClick={() => onSelect('revisi')}
        className="w-full text-left border-2 border-slate-200 hover:border-amber-400 hover:bg-amber-50 rounded-xl p-5 transition-all group">
        <div className="flex items-start gap-4">
          <div className="w-10 h-10 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center flex-shrink-0 group-hover:bg-amber-200 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="17 1 21 5 17 9"/>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"/>
              <polyline points="7 23 3 19 7 15"/>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"/>
            </svg>
          </div>
          <div>
            <p className="font-semibold text-slate-800 group-hover:text-amber-700">Revisi Dokumen</p>
            <p className="text-sm text-slate-500 mt-0.5 leading-relaxed">
              Dokumen berubah secara substansial. Versi lama jadi <span className="font-medium">kadaluarsa</span>, versi baru dibuat.
            </p>
            <p className="text-xs text-amber-600 font-medium mt-2 group-hover:text-amber-700">
              Rev {String(document.revision).padStart(2, '0')} → kadaluarsa &nbsp;·&nbsp; Baru: Rev {String(nextRevision).padStart(2, '0')}
            </p>
          </div>
        </div>
      </button>

      <div className="pt-2">
        <a href="/dashboard/documents" className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Batal, kembali ke daftar dokumen
        </a>
      </div>
    </div>
  );
}

// ─── Step 2: Form edit ────────────────────────────────────────
function EditForm({ document, documentTypes, departments, userId, mode, onBack }: {
  document: Document;
  documentTypes: DocumentType[];
  departments: Department[];
  userId: string;
  mode: 'koreksi' | 'revisi';
  onBack: () => void;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedTypeId, setSelectedTypeId] = useState(document.type_id);

  const filteredTypes = documentTypes.filter(dt => dt.category_id === document.category_id);

  const selectedType = documentTypes.find(t => t.id === selectedTypeId);
  const fieldConfig = getFieldConfig(document.category_name, selectedType?.name ?? document.type_name);

  const isRevisi = mode === 'revisi';
  const MAX_REVISION = 8;
  const newRevision = document.revision >= MAX_REVISION ? 0 : document.revision + 1;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);

    if (mode === 'koreksi' && formData.get('status') === 'dihapus') {
      const confirmed = window.confirm(
        'Yakin ingin mengubah status dokumen ini menjadi "Dihapus"? Semua revisi dengan nomor dokumen yang sama akan ikut terhapus.'
      );
      if (!confirmed) return;
    }

    startTransition(async () => {
      let result;
      if (mode === 'koreksi') {
        result = await correctDocument(document.id, formData);
      } else {
        result = await reviseDocument(document.id, document.revision, userId, formData);
      }

      if (result.error) {
        setError(result.error);
        return;
      }
      router.push('/dashboard/documents');
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Header mode */}
      <div className={`rounded-xl p-4 border ${isRevisi ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'}`}>
        <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full ${isRevisi ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'}`}>
          {isRevisi ? 'Revisi Dokumen' : 'Koreksi Penulisan'}
        </span>
        <p className="text-sm mt-2 text-slate-600">
          {isRevisi ? (
            <>Dokumen lama (Rev {String(document.revision).padStart(2, '0')}) akan jadi <strong>kadaluarsa</strong>. Baris baru: Rev <strong>{String(newRevision).padStart(2, '0')}</strong>.</>
          ) : (
            <>Perubahan langsung disimpan. Rev <strong>{String(document.revision).padStart(2, '0')}</strong> tidak berubah.</>
          )}
        </p>
      </div>

      {/* Nomor dokumen — readonly */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nomor Dokumen</label>
        <input type="text" name="doc_number" defaultValue={document.doc_number} readOnly
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
        <p className="text-xs text-slate-400 mt-1">Nomor dokumen tidak dapat diubah.</p>
      </div>

      {/* Judul */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Judul Dokumen <span className="text-red-500">*</span>
        </label>
        <input type="text" name="title" defaultValue={document.title} required
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="Judul dokumen" />
      </div>

      {/* Kategori — readonly */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategori</label>
        <input type="text" value={document.category_name} readOnly
          className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-500 cursor-not-allowed" />
        <input type="hidden" name="category_id" value={document.category_id} />
        <p className="text-xs text-slate-400 mt-1">Kategori tidak dapat diubah saat edit.</p>
      </div>

      {/* Jenis Dokumen */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-1.5">
          Jenis Dokumen <span className="text-red-500">*</span>
        </label>
        <select name="type_id" value={selectedTypeId} required
          onChange={e => setSelectedTypeId(e.target.value)}
          className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
          {filteredTypes.map(dt => (
            <option key={dt.id} value={dt.id}>{dt.name}</option>
          ))}
        </select>
      </div>

      {/* Departemen — hanya untuk QESH */}
      {fieldConfig.showDepartment && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            PIC (Bagian / Departemen) <span className="text-red-500">*</span>
          </label>
          <select name="department_id" defaultValue={document.department_id ?? ''} required={fieldConfig.showDepartment}
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="">Pilih Departemen</option>
            {departments.map(d => (
              <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
            ))}
          </select>
        </div>
      )}

      {/* Status — hanya di mode koreksi */}
      {!isRevisi && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Status Dokumen</label>
          <select name="status" defaultValue="terbaru"
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            <option value="terbaru">Terbaru</option>
            <option value="dihapus">Dihapus</option>
          </select>
          <p className="text-xs text-slate-400 mt-1">
            Mengubah ke <strong>Dihapus</strong> akan menonaktifkan semua revisi dengan nomor dokumen yang sama.
          </p>
        </div>
      )}

      {/* ─── TAMBAHAN: Production Type — hanya MSDS Kimia ─── */}
      {fieldConfig.showProductionType && (
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Production Type <span className="text-red-500">*</span>
          </label>
          <select
            name="production_type"
            defaultValue={document.production_type ?? ''}
            required
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Pilih Production Type</option>
            {PRODUCTION_TYPE_OPTIONS.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
      )}

      {/* Tanggal */}
      <div className={`grid grid-cols-1 gap-4 ${
        fieldConfig.showRevisionDate && fieldConfig.showExpiryDate
          ? 'sm:grid-cols-3'
          : fieldConfig.showExpiryDate
          ? 'sm:grid-cols-2'
          : 'sm:grid-cols-1'
      }`}>
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            Tanggal Efektif <span className="text-red-500">*</span>
          </label>
          <input type="date" name="effective_date" defaultValue={document.effective_date} required
            className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
        </div>

        {/* Tgl Revisi — hanya MSDS Kimia */}
        {fieldConfig.showRevisionDate && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Tgl Revisi <span className="text-red-500">*</span>
            </label>
            <input type="date" name="revision_date" defaultValue={document.revision_date ?? ''} required={fieldConfig.showRevisionDate}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        )}

        {/* Masa Berlaku — MSDS Kimia & Benang */}
        {fieldConfig.showExpiryDate && (
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">
              Masa Berlaku <span className="text-red-500">*</span>
            </label>
            <input type="date" name="expiry_date" defaultValue={document.expiry_date ?? ''} required={fieldConfig.showExpiryDate}
              className="w-full rounded-lg border border-slate-300 px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-100">
        <button type="button" onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          ← Ganti jenis perubahan
        </button>
        <div className="flex gap-3">
          <a href="/dashboard/documents" className="px-4 py-2.5 text-sm text-slate-600 hover:text-slate-800 transition-colors">Batal</a>
          <button type="submit" disabled={isPending}
            className={`px-5 py-2.5 text-sm font-medium text-white rounded-lg transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
              isRevisi ? 'bg-amber-500 hover:bg-amber-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}>
            {isPending
              ? isRevisi ? 'Memproses revisi...' : 'Menyimpan koreksi...'
              : isRevisi ? 'Simpan sebagai Revisi Baru' : 'Simpan Koreksi'}
          </button>
        </div>
      </div>
    </form>
  );
}
