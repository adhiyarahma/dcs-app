"use client";

import { useState, useEffect } from "react";
import clsx from "clsx";
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  DocumentTextIcon,
  BuildingOfficeIcon,
  CalendarIcon,
  ChevronDownIcon,
  CheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import {
  createDistribution,
  updateDistribution,
  deleteDistribution,
  type DistributionItemInput,
} from "@/app/lib/actions";
import { fetchNextFormNumber } from "@/app/lib/actions";

// ─── Types ────────────────────────────────────────────────────────────────────
type Head = { name: string; title: string | null };

type Dept = {
  id: string;
  code: string;
  name: string;
  heads?: Head[];
};

type DocOption = {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
  type_name: string;
  dept_code: string;
};

type DistItem = {
  id: string;
  quantity: number;
  document: {
    id: string;
    doc_number: string;
    title: string;
    revision: number;
  } | null;
};

type DistRecipient = {
  id: string;
  qty?: number;
  dept_id?: string;
  dept: Dept | null;
};

type Distribution = {
  id: string;
  form_number: string;
  distributed_date: string;
  notes: string | null;
  created_at: string;
  handed_by_dept: Dept | null;
  created_by_name: string;
  items: DistItem[];
  recipients: DistRecipient[];
};

// Tipe untuk penerima di form (dept + qty)
type RecipientEntry = {
  dept_id: string;
  qty: number;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const DCC_CODE = "DCC";

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  return new Date(dateStr).toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDeptHead(dept: Dept | null): Head | null {
  return dept?.heads?.[0] ?? null;
}

// ─── Pagination ───────────────────────────────────────────────────────────────
function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  const pages: (number | "...")[] = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i);
  } else {
    pages.push(1);
    if (currentPage > 3) pages.push("...");
    for (
      let i = Math.max(2, currentPage - 1);
      i <= Math.min(totalPages - 1, currentPage + 1);
      i++
    )
      pages.push(i);
    if (currentPage < totalPages - 2) pages.push("...");
    pages.push(totalPages);
  }

  return (
    <div className="flex items-center justify-between px-2 py-3 border-t border-slate-100">
      <p className="text-xs text-slate-400">
        Halaman{" "}
        <span className="font-semibold text-slate-600">{currentPage}</span> dari{" "}
        <span className="font-semibold text-slate-600">{totalPages}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronLeftIcon className="w-4 h-4" />
        </button>
        {pages.map((p, i) =>
          p === "..." ? (
            <span key={`dot-${i}`} className="px-2 text-slate-300 text-xs">
              ...
            </span>
          ) : (
            <button
              key={p}
              onClick={() => onPageChange(p as number)}
              className={clsx(
                "min-w-[28px] h-7 px-1.5 rounded-lg text-xs font-medium transition-all",
                p === currentPage
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              )}
            >
              {p}
            </button>
          )
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          <ChevronRightIcon className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────
function DeleteModal({
  formNumber,
  onConfirm,
  onCancel,
  loading,
}: {
  formNumber: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mb-3">
            <ExclamationTriangleIcon className="w-6 h-6 text-red-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            Konfirmasi Hapus
          </h2>
          <p className="text-sm text-slate-500">
            Hapus form distribusi{" "}
            <span className="font-semibold text-slate-700">"{formNumber}"</span>
            ?
          </p>
          <p className="text-xs text-red-500 mt-3 bg-red-50 px-3 py-2 rounded-lg w-full">
            Semua dokumen dan penerima dalam form ini akan ikut terhapus.
          </p>
        </div>
        <div className="flex gap-2 px-6 pb-6">
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-red-600 text-white rounded-xl hover:bg-red-700 disabled:opacity-50 transition-all"
          >
            {loading ? "Menghapus..." : "Hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Recipients with Qty ──────────────────────────────────────────────────────
// Komponen untuk menambah departemen penerima beserta qty masing-masing
function RecipientsInput({
  departments,
  recipients,
  onChange,
}: {
  departments: Dept[];
  recipients: RecipientEntry[];
  onChange: (entries: RecipientEntry[]) => void;
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Dept yang belum dipilih sebagai penerima
  const selectedIds = recipients.map((r) => r.dept_id);
  const availableDepts = departments.filter((d) => !selectedIds.includes(d.id));

  const filteredDepts = availableDepts.filter(
    (d) =>
      d.code.toLowerCase().includes(search.toLowerCase()) ||
      d.name.toLowerCase().includes(search.toLowerCase())
  );

  function addRecipient(deptId: string) {
    onChange([...recipients, { dept_id: deptId, qty: 1 }]);
    setDropdownOpen(false);
    setSearch("");
  }

  function removeRecipient(deptId: string) {
    onChange(recipients.filter((r) => r.dept_id !== deptId));
  }

  function updateQty(deptId: string, qty: number) {
    onChange(
      recipients.map((r) =>
        r.dept_id === deptId ? { ...r, qty: Math.max(1, qty) } : r
      )
    );
  }

  return (
    <div className="space-y-2">
      {/* Daftar penerima yang sudah dipilih */}
      {recipients.length > 0 && (
        <div className="space-y-2">
          {recipients.map((entry) => {
            const dept = departments.find((d) => d.id === entry.dept_id);
            if (!dept) return null;
            const head = getDeptHead(dept);
            return (
              <div
                key={entry.dept_id}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5"
              >
                {/* Info dept */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-blue-700">
                      {dept.code}
                    </span>
                    <span className="text-xs text-slate-600 truncate">
                      {dept.name}
                    </span>
                  </div>
                  {head?.name && (
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {head.name}
                    </p>
                  )}
                </div>
                {/* Input qty */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <label className="text-[10px] text-slate-400 font-medium uppercase tracking-wide">
                    Qty
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={entry.qty}
                    onChange={(e) =>
                      updateQty(entry.dept_id, parseInt(e.target.value) || 1)
                    }
                    className="w-16 border border-slate-200 rounded-lg px-2 py-1 text-sm text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
                  />
                </div>
                {/* Tombol hapus */}
                <button
                  type="button"
                  onClick={() => removeRecipient(entry.dept_id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tombol + dropdown tambah penerima */}
      {availableDepts.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Tambah penerima
          </button>

          {dropdownOpen && (
            <div className="absolute z-20 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari departemen..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                {filteredDepts.length === 0 && (
                  <p className="px-4 py-3 text-xs text-slate-400 text-center">
                    Tidak ditemukan
                  </p>
                )}
                {filteredDepts.map((dept) => {
                  const head = getDeptHead(dept);
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      onClick={() => addRecipient(dept.id)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                    >
                      <div>
                        <span className="font-mono text-xs font-bold text-blue-700 mr-2">
                          {dept.code}
                        </span>
                        <span className="text-slate-700">{dept.name}</span>
                        {head?.name && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {head.name}
                          </p>
                        )}
                      </div>
                      <PlusIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {recipients.length === 0 && (
        <p className="text-xs text-slate-400 italic">
          Belum ada penerima. Klik "Tambah penerima" di atas.
        </p>
      )}
    </div>
  );
}

// ─── Document List Input (1–5 dok, dept harus sama) ──────────────────────────
const MAX_DOCS = 5;

function DocListInput({
  docOptions,
  selectedIds,
  onChange,
}: {
  docOptions: DocOption[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  // Dept code dari dokumen pertama yang sudah dipilih (jadi acuan filter)
  const firstDoc = docOptions.find((d) => d.id === selectedIds[0]);
  const lockedDeptCode = firstDoc?.dept_code ?? null;

  // Dokumen yang tersedia: belum dipilih + (jika sudah ada pilihan pertama) dept harus sama
  const available = docOptions.filter((d) => {
    if (selectedIds.includes(d.id)) return false;
    if (lockedDeptCode && d.dept_code !== lockedDeptCode) return false;
    return true;
  });

  const filtered = available.filter(
    (d) =>
      d.doc_number.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase())
  );

  function addDoc(id: string) {
    onChange([...selectedIds, id]);
    setOpen(false);
    setSearch("");
  }

  function removeDoc(id: string) {
    const next = selectedIds.filter((s) => s !== id);
    onChange(next);
  }

  return (
    <div className="space-y-2">
      {/* Daftar dokumen yang sudah dipilih */}
      {selectedIds.length > 0 && (
        <div className="space-y-1.5">
          {selectedIds.map((id, idx) => {
            const doc = docOptions.find((d) => d.id === id);
            if (!doc) return null;
            return (
              <div
                key={id}
                className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2"
              >
                <span className="text-[10px] font-bold text-slate-400 w-4 shrink-0 text-center">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-700 truncate">
                    {doc.doc_number}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate">
                    {doc.title}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Rev. {doc.revision} · {doc.type_name}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => removeDoc(id)}
                  className="p-1 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <XMarkIcon className="w-4 h-4" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Tombol tambah dokumen (max 5) */}
      {selectedIds.length < MAX_DOCS && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Tambah dokumen
            {selectedIds.length > 0 && lockedDeptCode && (
              <span className="ml-1 text-slate-400 font-normal">
                (hanya dept{" "}
                <span className="font-mono font-bold text-slate-600">
                  {lockedDeptCode}
                </span>
                )
              </span>
            )}
          </button>

          {open && (
            <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari dokumen..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
                {filtered.length === 0 && (
                  <p className="px-4 py-3 text-xs text-slate-400 text-center">
                    {available.length === 0 && lockedDeptCode
                      ? `Tidak ada dokumen lain dari dept ${lockedDeptCode}`
                      : "Tidak ditemukan"}
                  </p>
                )}
                {filtered.map((doc) => (
                  <button
                    key={doc.id}
                    type="button"
                    onClick={() => addDoc(doc.id)}
                    className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-700">
                          {doc.doc_number}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {doc.title}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Rev. {doc.revision} · {doc.type_name}
                          {doc.dept_code && (
                            <span className="font-mono font-bold text-blue-600 ml-1">
                              · {doc.dept_code}
                            </span>
                          )}
                        </p>
                      </div>
                      <PlusIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {selectedIds.length === 0 && (
        <p className="text-xs text-slate-400 italic">
          Belum ada dokumen. Klik "Tambah dokumen" di atas.
        </p>
      )}

      <p className="text-[10px] text-slate-400 pl-0.5">
        Maks. {MAX_DOCS} dokumen per form · semua dokumen harus dari departemen
        yang sama.
      </p>
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
function FormModal({
  title,
  onClose,
  departments,
  docOptions,
  defaultValues,
  createdBy,
  initialFormNumber,
}: {
  title: string;
  onClose: () => void;
  departments: Dept[];
  docOptions: DocOption[];
  defaultValues?: Distribution;
  createdBy: string;
  initialFormNumber?: string;
}) {
  const isEdit = !!defaultValues;

  // [PERBAIKAN 2] Filter departemen DCC saja untuk "Diserahkan Oleh"
  const dccDepartments = departments.filter((d) => d.code === DCC_CODE);

  const [formNumber, setFormNumber] = useState(
    defaultValues?.form_number ?? initialFormNumber ?? ""
  );
  const [distributedDate, setDistributedDate] = useState(
    defaultValues?.distributed_date ?? new Date().toISOString().split("T")[0]
  );
  const [handedByDeptId, setHandedByDeptId] = useState(
    defaultValues?.handed_by_dept?.id ?? ""
  );

  // [PERBAIKAN 1] Recipients sekarang menyimpan { dept_id, qty } per entri
  const [recipients, setRecipients] = useState<RecipientEntry[]>(
    defaultValues?.recipients
      .filter((r) => r.dept?.id)
      .map((r) => ({
        dept_id: r.dept!.id,
        qty: r.qty ?? 1,
      })) ?? []
  );

  // Daftar dokumen (1–5), semua harus dari departemen yang sama
  const [documentIds, setDocumentIds] = useState<string[]>(
    defaultValues?.items
      .map((i) => i.document?.id)
      .filter((id): id is string => !!id) ?? []
  );

  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handedByDept = dccDepartments.find((d) => d.id === handedByDeptId);
  const handedByHead = getDeptHead(handedByDept ?? null);

  async function regenerateFormNumber() {
    setRegenerating(true);
    const next = await fetchNextFormNumber();
    setFormNumber(next);
    setRegenerating(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (documentIds.length === 0) {
      setError("Minimal 1 dokumen harus dipilih.");
      return;
    }
    if (recipients.length === 0) {
      setError("Minimal 1 departemen penerima harus dipilih.");
      return;
    }

    // Setiap dokumen mendapat qty = total salinan dari semua penerima
    const totalQty = recipients.reduce((sum, r) => sum + r.qty, 0);
    const validItems: DistributionItemInput[] = documentIds.map((id) => ({
      document_id: id,
      quantity: totalQty,
    }));

    const recipientIds = recipients.map((r) => r.dept_id);

    setLoading(true);
    const result = isEdit
      ? await updateDistribution(
          defaultValues.id,
          formNumber,
          distributedDate,
          handedByDeptId,
          validItems,
          recipientIds,
          notes
        )
      : await createDistribution(
          formNumber,
          distributedDate,
          handedByDeptId,
          validItems,
          recipientIds,
          createdBy,
          notes
        );
    setLoading(false);

    if (result?.error) setError(result.error);
    else onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
          <h2 className="text-sm font-bold text-slate-800">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form
          onSubmit={handleSubmit}
          className="flex flex-col overflow-hidden flex-1"
        >
          <div className="overflow-y-auto px-6 py-5 space-y-5">
            {/* Row 1: No Form + Tanggal */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Nomor Form
                </label>
                <div className="flex gap-2">
                  <input
                    value={formNumber}
                    onChange={(e) => setFormNumber(e.target.value)}
                    required
                    placeholder="001/DCC/05/26"
                    className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                  />
                  {!isEdit && (
                    <button
                      type="button"
                      onClick={regenerateFormNumber}
                      disabled={regenerating}
                      title="Generate ulang nomor"
                      className="p-2.5 border border-slate-200 rounded-xl text-slate-400 hover:text-blue-600 hover:border-blue-300 transition-all disabled:opacity-50"
                    >
                      <ArrowPathIcon
                        className={clsx(
                          "w-4 h-4",
                          regenerating && "animate-spin"
                        )}
                      />
                    </button>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 mt-1 pl-1">
                  Auto-generated · bisa diedit manual
                </p>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                  Tanggal Distribusi
                </label>
                <input
                  type="date"
                  value={distributedDate}
                  onChange={(e) => setDistributedDate(e.target.value)}
                  required
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
                />
              </div>
            </div>

            {/* Diterima Oleh — PERBAIKAN 1: list + qty per dept */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Diterima Oleh
                <span className="ml-1 font-normal text-slate-400 normal-case">
                  — departemen penerima & jumlah salinan
                </span>
              </label>
              <RecipientsInput
                departments={departments}
                recipients={recipients}
                onChange={setRecipients}
              />
            </div>

            {/* Diserahkan Oleh — PERBAIKAN 2: hanya DCC */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Diserahkan Oleh
              </label>
              <select
                value={handedByDeptId}
                onChange={(e) => setHandedByDeptId(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
              >
                <option value="">Pilih pengirim (DCC)...</option>
                {dccDepartments.map((d) => {
                  const h = getDeptHead(d);
                  return (
                    <option key={d.id} value={d.id}>
                      {d.code} - {d.name}
                      {h?.name ? ` (${h.name})` : ""}
                    </option>
                  );
                })}
              </select>
              {handedByHead?.name && (
                <p className="text-xs text-slate-400 mt-1.5 pl-1">
                  Kepala:{" "}
                  <span className="font-medium text-slate-600">
                    {handedByHead.name}
                  </span>
                  {handedByHead.title && ` · ${handedByHead.title}`}
                </p>
              )}
              {dccDepartments.length === 0 && (
                <p className="text-xs text-amber-500 mt-1.5 pl-1">
                  Tidak ada departemen dengan kode DCC ditemukan.
                </p>
              )}
            </div>

            {/* Daftar Dokumen — 1–5 dok, dept harus sama */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Daftar Dokumen
                <span className="ml-1 font-normal text-slate-400 normal-case">
                  — maks. {MAX_DOCS} dokumen, departemen yang sama
                </span>
              </label>
              <DocListInput
                docOptions={docOptions}
                selectedIds={documentIds}
                onChange={setDocumentIds}
              />
            </div>

            {/* Catatan */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Catatan{" "}
                <span className="font-normal text-slate-400 normal-case">
                  (opsional)
                </span>
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Catatan tambahan..."
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all resize-none"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
                {error}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex gap-2 justify-end px-6 py-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-sm font-medium border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition-all"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
            >
              {loading ? "Menyimpan..." : isEdit ? "Update" : "Simpan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function DistributionsTable({
  distributions,
  departments,
  docOptions,
  currentUserId,
  initialFormNumber,
}: {
  distributions: Distribution[];
  departments: Dept[];
  docOptions: DocOption[];
  currentUserId: string;
  initialFormNumber: string;
}) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Distribution | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Distribution | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [nextFormNumber, setNextFormNumber] = useState(initialFormNumber);

  // Refresh nomor form setiap kali modal create dibuka
  useEffect(() => {
    if (showCreate) {
      fetchNextFormNumber().then(setNextFormNumber);
    }
  }, [showCreate]);

  const filtered = distributions.filter(
    (d) =>
      d.form_number.toLowerCase().includes(search.toLowerCase()) ||
      (d.handed_by_dept?.name.toLowerCase().includes(search.toLowerCase()) ??
        false) ||
      (d.handed_by_dept?.code.toLowerCase().includes(search.toLowerCase()) ??
        false)
  );

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    const result = await deleteDistribution(deleteTarget.id);
    setDeleteLoading(false);
    if (result?.error) setDeleteError(result.error);
    else setDeleteTarget(null);
  }

  return (
    <div className="space-y-5">
      {/* Stat card */}
      <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
        <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
          <DocumentTextIcon className="w-6 h-6" />
        </div>
        <div>
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
            Total Form Distribusi
          </p>
          <p className="text-2xl font-bold text-slate-900">
            {distributions.length}
          </p>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor form atau departemen..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <button
          onClick={() => {
            setShowCreate(true);
            setEditItem(null);
          }}
          className="flex items-center justify-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-800 transition-all active:scale-95 shrink-0"
        >
          <PlusIcon className="w-4 h-4" />
          Tambah Form
        </button>
      </div>

      {deleteError && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-4 py-3">
          {deleteError}
        </div>
      )}

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Nomor Form
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Tanggal
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Diserahkan Oleh
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Diterima Oleh
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Dokumen
                </th>
                <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paginated.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-10 text-center text-slate-400 text-sm"
                  >
                    Tidak ada data ditemukan.
                  </td>
                </tr>
              )}
              {paginated.map((dist) => {
                const handedHead = getDeptHead(dist.handed_by_dept);
                return (
                  <tr
                    key={dist.id}
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                        {dist.form_number}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                        {formatDate(dist.distributed_date)}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {dist.handed_by_dept ? (
                        <div>
                          <p className="text-sm font-medium text-slate-700">
                            <span className="font-mono text-xs font-bold text-blue-600 mr-1">
                              {dist.handed_by_dept.code}
                            </span>
                            {dist.handed_by_dept.name}
                          </p>
                          {handedHead?.name && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {handedHead.name}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {dist.recipients.map((r) =>
                          r.dept ? (
                            <span
                              key={r.id}
                              className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"
                              title={`${r.dept.code} - ${r.dept.name}${
                                r.qty ? ` · ${r.qty} salinan` : ""
                              }`}
                            >
                              <BuildingOfficeIcon className="w-3 h-3" />
                              {r.dept.code}
                              {r.qty && (
                                <span className="text-slate-400">×{r.qty}</span>
                              )}
                            </span>
                          ) : null
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {dist.items.length > 0 ? (
                        <div className="space-y-0.5">
                          {dist.items.slice(0, 2).map((item) =>
                            item.document ? (
                              <p
                                key={item.id}
                                className="text-xs font-bold text-slate-700"
                              >
                                {item.document.doc_number}
                              </p>
                            ) : null
                          )}
                          {dist.items.length > 2 && (
                            <p className="text-[10px] text-slate-400">
                              +{dist.items.length - 2} lainnya
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-300">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => {
                            setEditItem(dist);
                            setShowCreate(false);
                          }}
                          className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setDeleteTarget(dist);
                            setDeleteError("");
                          }}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>

      {/* Card list — mobile */}
      <div className="sm:hidden space-y-2">
        {paginated.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-slate-400 text-sm">
            Tidak ada data ditemukan.
          </div>
        )}
        {paginated.map((dist) => {
          const handedHead = getDeptHead(dist.handed_by_dept);
          return (
            <div
              key={dist.id}
              className="bg-white border border-slate-200 rounded-2xl px-4 py-3 shadow-sm"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-md border border-blue-100">
                    {dist.form_number}
                  </span>
                  <p className="text-xs text-slate-400 mt-1.5 flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {formatDate(dist.distributed_date)}
                  </p>
                  {dist.handed_by_dept && (
                    <p className="text-xs text-slate-600 mt-1">
                      Dari:{" "}
                      <span className="font-medium">
                        {dist.handed_by_dept.code} - {dist.handed_by_dept.name}
                      </span>
                      {handedHead?.name && (
                        <span className="text-slate-400">
                          {" "}
                          · {handedHead.name}
                        </span>
                      )}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {dist.recipients.map((r) =>
                      r.dept ? (
                        <span
                          key={r.id}
                          className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-full"
                        >
                          {r.dept.code}
                          {r.qty && (
                            <span className="text-slate-400"> ×{r.qty}</span>
                          )}
                        </span>
                      ) : null
                    )}
                  </div>
                  {dist.items.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {dist.items.slice(0, 2).map((item) =>
                        item.document ? (
                          <p
                            key={item.id}
                            className="text-[10px] text-slate-400 truncate"
                          >
                            📄 {item.document.doc_number} —{" "}
                            {item.document.title}
                          </p>
                        ) : null
                      )}
                      {dist.items.length > 2 && (
                        <p className="text-[10px] text-slate-400">
                          +{dist.items.length - 2} dok lainnya
                        </p>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => setEditItem(dist)}
                    className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <PencilIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setDeleteTarget(dist);
                      setDeleteError("");
                    }}
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mt-3">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modal Tambah */}
      {showCreate && (
        <FormModal
          title="Tambah Form Distribusi"
          onClose={() => setShowCreate(false)}
          departments={departments}
          docOptions={docOptions}
          createdBy={currentUserId}
          initialFormNumber={nextFormNumber}
        />
      )}

      {/* Modal Edit */}
      {editItem && (
        <FormModal
          title="Edit Form Distribusi"
          onClose={() => setEditItem(null)}
          departments={departments}
          docOptions={docOptions}
          defaultValues={editItem}
          createdBy={currentUserId}
        />
      )}

      {/* Modal Hapus */}
      {deleteTarget && (
        <DeleteModal
          formNumber={deleteTarget.form_number}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleteLoading}
        />
      )}
    </div>
  );
}
