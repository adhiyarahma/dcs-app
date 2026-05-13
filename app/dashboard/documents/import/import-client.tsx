'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowUpTrayIcon, ArrowDownTrayIcon, DocumentArrowDownIcon, CheckCircleIcon, XCircleIcon, ArchiveBoxIcon } from '@heroicons/react/24/outline';

type Category = { id: string; name: string };
type DocType = { id: string; name: string; category_id: string };

export default function ImportClient({ userId }: { userId: string }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const zipRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [docTypes, setDocTypes] = useState<DocType[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [zipLoading, setZipLoading] = useState(false);
  const [result, setResult] = useState<{ success: number; errors: string[]; total: number } | null>(null);
  const [zipResult, setZipResult] = useState<{ success: number; errors: string[]; total: number } | null>(null);
  const [importDone, setImportDone] = useState(false);

  useEffect(() => {
    fetch('/api/master-data').then(r => r.json()).then(data => {
      setCategories(data.categories ?? []);
      setDocTypes(data.documentTypes ?? []);
    });
  }, []);

  const filteredTypes = docTypes.filter(t => t.category_id === selectedCategory);
  const step2Active = !!(selectedCategory && selectedType);
  const step3Active = !!(selectedCategory && selectedType && file);
  const step4Active = importDone;
  const templateUrl = step2Active
    ? `/api/export-documents/template?category_id=${selectedCategory}&type_id=${selectedType}`
    : null;
  const selectedCategoryName = categories.find(c => c.id === selectedCategory)?.name ?? '';
  const selectedTypeName = filteredTypes.find(t => t.id === selectedType)?.name ?? '';

  async function handleImport() {
    if (!file || !selectedCategory || !selectedType) return;
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('category_id', selectedCategory);
      fd.append('type_id', selectedType);
      fd.append('uploaded_by', userId);
      const res = await fetch('/api/import-documents', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      if (data.success > 0) setImportDone(true);
    } catch (err: any) {
      setResult({ success: 0, errors: [err.message], total: 0 });
    } finally {
      setLoading(false);
    }
  }

  async function handleZipImport() {
    if (!zipFile) return;
    setZipLoading(true);
    setZipResult(null);
    try {
      const fd = new FormData();
      fd.append('file', zipFile);
      const res = await fetch('/api/import-zip', { method: 'POST', body: fd });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setZipResult(data);
    } catch (err: any) {
      setZipResult({ success: 0, errors: [err.message], total: 0 });
    } finally {
      setZipLoading(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">Import Dokumen</h1>
        <p className="text-sm text-slate-400 mt-1">Import data dan file dokumen massal dari Excel + ZIP.</p>
      </div>

      {/* Step 1 */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${step2Active ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
            {step2Active ? '✓' : '1'}
          </span>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Pilih Kategori & Jenis Dokumen</h2>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Kategori <span className="text-red-500">*</span></label>
            <select value={selectedCategory}
              onChange={e => { setSelectedCategory(e.target.value); setSelectedType(''); setFile(null); setResult(null); setImportDone(false); }}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 bg-white">
              <option value="">Pilih kategori...</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Jenis Dokumen <span className="text-red-500">*</span></label>
            <select value={selectedType}
              onChange={e => { setSelectedType(e.target.value); setFile(null); setResult(null); setImportDone(false); }}
              disabled={!selectedCategory}
              className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 bg-white disabled:opacity-50">
              <option value="">Pilih jenis...</option>
              {filteredTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        {step2Active && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
            <CheckCircleIcon className="w-4 h-4 text-blue-500 shrink-0" />
            <span className="text-xs text-blue-700 font-medium">{selectedCategoryName} → {selectedTypeName}</span>
            {templateUrl && (
              <a href={templateUrl} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-all">
                <DocumentArrowDownIcon className="w-3.5 h-3.5" />
                Download Template
              </a>
            )}
          </div>
        )}
      </div>

      {/* Step 2 */}
      <div className={`bg-white border rounded-2xl p-6 shadow-sm space-y-4 transition-all ${step2Active ? 'border-slate-200' : 'border-slate-100 opacity-40 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${file ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
            {file ? '✓' : '2'}
          </span>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Upload File Excel</h2>
        </div>
        <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50/50 transition-all">
          <ArrowUpTrayIcon className="w-8 h-8 text-slate-300" />
          {file ? <span className="text-sm font-medium text-slate-700">{file.name}</span>
            : <span className="text-sm text-slate-400">Klik untuk pilih file <span className="font-semibold text-blue-500">.xlsx</span></span>}
          <input ref={fileRef} type="file" accept=".xlsx,.xls" className="hidden"
            onChange={e => { setFile(e.target.files?.[0] ?? null); setResult(null); setImportDone(false); }} />
        </label>
        {file && <button onClick={() => { setFile(null); setResult(null); setImportDone(false); if (fileRef.current) fileRef.current.value = ''; }}
          className="text-xs text-slate-400 hover:text-red-500 transition-all">× Hapus file</button>}
      </div>

      {/* Step 3 */}
      <div className={`bg-white border rounded-2xl p-6 shadow-sm space-y-4 transition-all ${step3Active ? 'border-slate-200' : 'border-slate-100 opacity-40 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${importDone ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
            {importDone ? '✓' : '3'}
          </span>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Import Data Excel</h2>
        </div>
        <button onClick={handleImport} disabled={!step3Active || loading}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 disabled:opacity-50 transition-all">
          <ArrowUpTrayIcon className="w-4 h-4" />
          {loading ? 'Mengimport...' : 'Import Sekarang'}
        </button>
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-sm text-slate-700">
                <span className="font-bold text-emerald-600">{result.success}</span> dari {result.total} baris berhasil diimport.
              </span>
            </div>
            {result.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide flex items-center gap-1">
                  <XCircleIcon className="w-4 h-4" /> {result.errors.length} error
                </p>
                <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                  {result.errors.map((e, i) => <li key={i} className="text-xs text-red-500">{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Step 4 - Upload ZIP */}
      <div className={`bg-white border rounded-2xl p-6 shadow-sm space-y-4 transition-all ${step4Active ? 'border-slate-200' : 'border-slate-100 opacity-40 pointer-events-none'}`}>
        <div className="flex items-center gap-2">
          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${zipResult && zipResult.success > 0 ? 'bg-emerald-500 text-white' : 'bg-blue-600 text-white'}`}>
            {zipResult && zipResult.success > 0 ? '✓' : '4'}
          </span>
          <h2 className="text-sm font-bold text-slate-700 uppercase tracking-wide">Upload File Dokumen (ZIP) <span className="text-slate-400 font-normal normal-case text-xs ml-1">— opsional</span></h2>
        </div>

        <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-1">
          <p className="text-xs font-bold text-amber-700">Konvensi penamaan file di dalam ZIP:</p>
          <p className="text-xs text-amber-600 font-mono">{'{doc_number}_{label}.{ext}'}</p>
          <p className="text-xs text-amber-500">Contoh: <span className="font-mono">DOC-001_pdf.pdf &nbsp; DOC-001_word.docx &nbsp; DOC-002_indonesia.pdf</span></p>
        </div>

        <label className="flex flex-col items-center justify-center gap-3 p-8 border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-amber-400 hover:bg-amber-50/50 transition-all">
          <ArchiveBoxIcon className="w-8 h-8 text-slate-300" />
          {zipFile ? <span className="text-sm font-medium text-slate-700">{zipFile.name}</span>
            : <span className="text-sm text-slate-400">Klik untuk pilih file <span className="font-semibold text-amber-500">.zip</span></span>}
          <input ref={zipRef} type="file" accept=".zip" className="hidden"
            onChange={e => { setZipFile(e.target.files?.[0] ?? null); setZipResult(null); }} />
        </label>
        {zipFile && <button onClick={() => { setZipFile(null); setZipResult(null); if (zipRef.current) zipRef.current.value = ''; }}
          className="text-xs text-slate-400 hover:text-red-500 transition-all">× Hapus file</button>}

        <button onClick={handleZipImport} disabled={!zipFile || zipLoading}
          className="flex items-center gap-2 px-6 py-2.5 bg-amber-500 text-white rounded-xl text-sm font-bold hover:bg-amber-600 disabled:opacity-50 transition-all">
          <ArchiveBoxIcon className="w-4 h-4" />
          {zipLoading ? 'Mengupload...' : 'Upload ZIP'}
        </button>

        {zipResult && (
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
              <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />
              <span className="text-sm text-slate-700">
                <span className="font-bold text-emerald-600">{zipResult.success}</span> dari {zipResult.total} file berhasil diupload.
              </span>
            </div>
            {zipResult.errors.length > 0 && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl space-y-1">
                <p className="text-xs font-bold text-red-600 uppercase tracking-wide flex items-center gap-1">
                  <XCircleIcon className="w-4 h-4" /> {zipResult.errors.length} error
                </p>
                <ul className="space-y-0.5 max-h-32 overflow-y-auto">
                  {zipResult.errors.map((e, i) => <li key={i} className="text-xs text-red-500">{e}</li>)}
                </ul>
              </div>
            )}
            {zipResult.success > 0 && (
              <button onClick={() => router.push('/dashboard/documents')}
                className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
                Lihat Dokumen →
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <a href="/api/export-documents"
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-500 rounded-xl text-sm hover:bg-slate-50 transition-all">
          <ArrowDownTrayIcon className="w-4 h-4" />
          Export Semua Dokumen
        </a>
      </div>
    </div>
  );
}
