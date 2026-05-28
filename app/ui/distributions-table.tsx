"use client";

import { useState } from "react";
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
} from "@heroicons/react/24/outline";
import {
  createDistribution,
  updateDistribution,
  deleteDistribution,
  type DistributionItemInput,
} from "@/app/lib/actions";

// ─── Types ────────────────────────────────────────────────────────────────────
type Dept = {
  id: string;
  code: string;
  name: string;
  head_name: string | null;
  head_title: string | null;
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

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function formatDate(dateStr: string) {
  if (!dateStr) return "-";
  const d = new Date(dateStr);
  return d.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
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

// ─── Multi-select Dropdown ────────────────────────────────────────────────────
function MultiSelectDept({
  label,
  options,
  selected,
  onChange,
}: {
  label: string;
  options: Dept[];
  selected: string[];
  onChange: (ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const selectedDepts = options.filter((d) => selected.includes(d.id));

  function toggle(id: string) {
    if (selected.includes(id)) onChange(selected.filter((s) => s !== id));
    else onChange([...selected, id]);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-left hover:border-blue-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
      >
        <span
          className={clsx(
            "truncate",
            selectedDepts.length === 0 && "text-slate-400"
          )}
        >
          {selectedDepts.length === 0
            ? `Pilih ${label}...`
            : selectedDepts.map((d) => `${d.code} - ${d.name}`).join(", ")}
        </span>
        <ChevronDownIcon
          className={clsx(
            "w-4 h-4 text-slate-400 shrink-0 ml-2 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
          <div className="max-h-48 overflow-y-auto divide-y divide-slate-50">
            {options.map((dept) => {
              const isSelected = selected.includes(dept.id);
              return (
                <button
                  key={dept.id}
                  type="button"
                  onClick={() => toggle(dept.id)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                >
                  <div>
                    <span className="font-mono text-xs font-bold text-blue-700 mr-2">
                      {dept.code}
                    </span>
                    <span className="text-slate-700">{dept.name}</span>
                    {dept.head_name && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        {dept.head_name}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <CheckIcon className="w-4 h-4 text-blue-600 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Document Row ─────────────────────────────────────────────────────────────
function DocRow({
  index,
  docOptions,
  value,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  docOptions: DocOption[];
  value: DistributionItemInput;
  onChange: (v: DistributionItemInput) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const selected = docOptions.find((d) => d.id === value.document_id);

  const filtered = docOptions.filter(
    (d) =>
      d.doc_number.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex items-start gap-2">
      {/* No */}
      <span className="w-6 text-xs text-slate-400 text-center pt-3 shrink-0">
        {index + 1}
      </span>

      {/* Dokumen picker */}
      <div className="flex-1 relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between border border-slate-200 rounded-xl px-3 py-2.5 text-sm text-left hover:border-blue-400 transition-all bg-white"
        >
          <span className={clsx("truncate", !selected && "text-slate-400")}>
            {selected
              ? `${selected.doc_number} — ${selected.title}`
              : "Pilih dokumen..."}
          </span>
          <ChevronDownIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
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
            <div className="max-h-44 overflow-y-auto divide-y divide-slate-50">
              {filtered.length === 0 && (
                <p className="px-4 py-3 text-xs text-slate-400 text-center">
                  Tidak ditemukan
                </p>
              )}
              {filtered.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    onChange({ ...value, document_id: doc.id });
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-700">
                    {doc.doc_number}
                  </p>
                  <p className="text-xs text-slate-500 truncate">{doc.title}</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    Rev. {doc.revision} · {doc.type_name}
                    {doc.dept_code && ` · ${doc.dept_code}`}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Qty */}
      <input
        type="number"
        min={1}
        value={value.quantity}
        onChange={(e) =>
          onChange({ ...value, quantity: parseInt(e.target.value) || 1 })
        }
        className="w-16 border border-slate-200 rounded-xl px-2 py-2.5 text-sm text-center outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
      />

      {/* Remove */}
      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="p-2.5 text-slate-300 hover:text-red-500 disabled:opacity-0 transition-colors mt-0.5"
      >
        <XMarkIcon className="w-4 h-4" />
      </button>
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
}: {
  title: string;
  onClose: () => void;
  departments: Dept[];
  docOptions: DocOption[];
  defaultValues?: Distribution;
  createdBy: string;
}) {
  const [formNumber, setFormNumber] = useState(
    defaultValues?.form_number ?? ""
  );
  const [distributedDate, setDistributedDate] = useState(
    defaultValues?.distributed_date ?? ""
  );
  const [handedByDeptId, setHandedByDeptId] = useState(
    defaultValues?.handed_by_dept?.id ?? ""
  );
  const [recipientIds, setRecipientIds] = useState<string[]>(
    defaultValues?.recipients.map((r) => r.dept?.id ?? "").filter(Boolean) ?? []
  );
  const [items, setItems] = useState<DistributionItemInput[]>(
    defaultValues?.items.map((i) => ({
      document_id: i.document?.id ?? "",
      quantity: i.quantity,
    })) ?? [{ document_id: "", quantity: 1 }]
  );
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const isEdit = !!defaultValues;

  function addItem() {
    if (items.length >= 40) return;
    setItems([...items, { document_id: "", quantity: 1 }]);
  }

  function updateItem(index: number, val: DistributionItemInput) {
    const next = [...items];
    next[index] = val;
    setItems(next);
  }

  function removeItem(index: number) {
    setItems(items.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validItems = items.filter((i) => i.document_id);
    if (!validItems.length) {
      setError("Minimal 1 dokumen harus dipilih.");
      return;
    }

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

  const handedByDept = departments.find((d) => d.id === handedByDeptId);

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
                <input
                  value={formNumber}
                  onChange={(e) => setFormNumber(e.target.value)}
                  required
                  placeholder="001/MRP/05/26"
                  className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all font-mono"
                />
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

            {/* Diserahkan Oleh */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Diserahkan Oleh (Departemen Pengirim)
              </label>
              <select
                value={handedByDeptId}
                onChange={(e) => setHandedByDeptId(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all bg-white"
              >
                <option value="">Pilih departemen pengirim...</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.code} - {d.name}
                    {d.head_name ? ` (${d.head_name})` : ""}
                  </option>
                ))}
              </select>
              {handedByDept?.head_name && (
                <p className="text-xs text-slate-400 mt-1.5 pl-1">
                  Kepala:{" "}
                  <span className="font-medium text-slate-600">
                    {handedByDept.head_name}
                  </span>
                  {handedByDept.head_title && ` · ${handedByDept.head_title}`}
                </p>
              )}
            </div>

            {/* Diterima Oleh */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">
                Diterima Oleh (Departemen Penerima)
                <span className="ml-1 font-normal text-slate-400 normal-case">
                  — bisa lebih dari 1
                </span>
              </label>
              <MultiSelectDept
                label="departemen penerima"
                options={departments}
                selected={recipientIds}
                onChange={setRecipientIds}
              />
              {recipientIds.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {recipientIds.map((id) => {
                    const dept = departments.find((d) => d.id === id);
                    if (!dept) return null;
                    return (
                      <span
                        key={id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs font-medium rounded-full border border-blue-100"
                      >
                        {dept.code} - {dept.name}
                        <button
                          type="button"
                          onClick={() =>
                            setRecipientIds(
                              recipientIds.filter((r) => r !== id)
                            )
                          }
                          className="ml-0.5 hover:text-blue-900"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Daftar Dokumen */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Daftar Dokumen
                  <span className="ml-1 font-normal text-slate-400 normal-case">
                    ({items.length}/40)
                  </span>
                </label>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <span>No.</span>
                  <span className="w-32 text-center">Dokumen</span>
                  <span className="w-10 text-center">Qty</span>
                </div>
              </div>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <DocRow
                    key={index}
                    index={index}
                    docOptions={docOptions}
                    value={item}
                    onChange={(v) => updateItem(index, v)}
                    onRemove={() => removeItem(index)}
                    canRemove={items.length > 1}
                  />
                ))}
              </div>

              {items.length < 40 && (
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-3 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Tambah baris
                </button>
              )}
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
}: {
  distributions: Distribution[];
  departments: Dept[];
  docOptions: DocOption[];
  currentUserId: string;
}) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Distribution | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Distribution | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");

  // Filter
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
              {paginated.map((dist) => (
                <tr
                  key={dist.id}
                  className="hover:bg-slate-50 transition-colors"
                >
                  {/* No Form */}
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold bg-blue-50 text-blue-700 px-2.5 py-1 rounded-lg border border-blue-100">
                      {dist.form_number}
                    </span>
                  </td>
                  {/* Tanggal */}
                  <td className="px-6 py-4 text-sm text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <CalendarIcon className="w-3.5 h-3.5 text-slate-400" />
                      {formatDate(dist.distributed_date)}
                    </div>
                  </td>
                  {/* Diserahkan Oleh */}
                  <td className="px-6 py-4">
                    {dist.handed_by_dept ? (
                      <div>
                        <p className="text-sm font-medium text-slate-700">
                          <span className="font-mono text-xs font-bold text-blue-600 mr-1">
                            {dist.handed_by_dept.code}
                          </span>
                          {dist.handed_by_dept.name}
                        </p>
                        {dist.handed_by_dept.head_name && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {dist.handed_by_dept.head_name}
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-300">-</span>
                    )}
                  </td>
                  {/* Diterima Oleh */}
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {dist.recipients.map((r) =>
                        r.dept ? (
                          <span
                            key={r.id}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"
                            title={r.dept.head_name ?? undefined}
                          >
                            <BuildingOfficeIcon className="w-3 h-3" />
                            {r.dept.code}
                          </span>
                        ) : null
                      )}
                    </div>
                  </td>
                  {/* Dokumen */}
                  <td className="px-6 py-4">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-bold rounded-full">
                      {dist.items.length} dok
                    </span>
                  </td>
                  {/* Aksi */}
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
              ))}
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
        {paginated.map((dist) => (
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
                      </span>
                    ) : null
                  )}
                </div>
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
        ))}
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
