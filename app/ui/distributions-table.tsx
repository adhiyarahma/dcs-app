"use client";

import { useState, useEffect, useMemo } from "react";
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
  ArrowPathIcon,
  EyeIcon,
  ArrowUpTrayIcon,
  FunnelIcon,
} from "@heroicons/react/24/outline";
import DistributionSpreadsheetView from "./DistributionSpreadsheetView";
import ImportDistributionModal from "./ImportDistributionModal";
import {
  createDistribution,
  updateDistribution,
  deleteDistribution,
  fetchNextFormNumber,
  type DistributionItemInput,
  type DistributionRecipientInput,
} from "@/app/lib/actions";

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
  status?: string; // "terbaru" | "kadaluarsa" | "dihapus"
};

type DistRecipient = {
  id: string;
  qty: number;
  dept_id?: string;
  head_name?: string | null;
  dept: Dept | null;
};

type DistItem = {
  id: string;
  distributed_date?: string | null;
  document: {
    id: string;
    doc_number: string;
    title: string;
    revision: number;
    category_id?: string | null;
    type_id?: string | null;
  } | null;
  recipients: DistRecipient[];
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
};

type ItemFormEntry = {
  document_id: string;
  override_date: string | null;
  recipients: DistributionRecipientInput[];
};

type CategoryOpt = {
  id: string;
  name: string;
};

type DocTypeOpt = {
  id: string;
  name: string;
  category_id: string;
};

// ─── Constants ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 10;
const DCC_CODE = "DCC";
const MAX_DOCS = 5;

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

function emptyItem(): ItemFormEntry {
  return { document_id: "", override_date: null, recipients: [] };
}

// Ambil kategori & jenis dokumen "perwakilan" dari sebuah form distribusi.
// Asumsi bisnis: 1 form distribusi = 1 jenis dokumen yang sama, jadi cukup
// ambil dari dokumen pertama yang tersedia dalam item-nya.
function getDistDocInfo(dist: Distribution) {
  const doc = dist.items.find((i) => i.document)?.document;
  return {
    category_id: doc?.category_id ?? null,
    type_id: doc?.type_id ?? null,
  };
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

// ─── Doc Dropdown ─────────────────────────────────────────────────────────────
function DocDropdown({
  docOptions,
  value,
  usedIds,
  lockedDeptCode,
  onChange,
}: {
  docOptions: DocOption[];
  value: string;
  usedIds: string[];
  lockedDeptCode: string | null;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selected = docOptions.find((d) => d.id === value);

  const available = docOptions.filter((d) => {
    if (usedIds.includes(d.id) && d.id !== value) return false;
    if (lockedDeptCode && d.dept_code !== lockedDeptCode) return false;
    return true;
  });

  const filtered = available.filter(
    (d) =>
      d.doc_number.toLowerCase().includes(search.toLowerCase()) ||
      d.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="relative flex-1">
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
        <div className="absolute z-30 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
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
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-xs text-slate-400 text-center">
                {lockedDeptCode
                  ? `Tidak ada dokumen dari dept ${lockedDeptCode}`
                  : "Tidak ditemukan"}
              </p>
            ) : (
              filtered.map((doc) => (
                <button
                  key={doc.id}
                  type="button"
                  onClick={() => {
                    onChange(doc.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className="w-full px-4 py-2.5 text-left hover:bg-slate-50 transition-colors"
                >
                  <p className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    {doc.doc_number}
                    {doc.status && doc.status !== "terbaru" && (
                      <span
                        className={clsx(
                          "text-[9px] px-1.5 py-0.5 rounded-full font-semibold",
                          doc.status === "dihapus"
                            ? "bg-red-50 text-red-600"
                            : "bg-amber-50 text-amber-600"
                        )}
                      >
                        {doc.status === "dihapus" ? "Dihapus" : "Kadaluarsa"}
                      </span>
                    )}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Recipients Input (per item) ──────────────────────────────────────────────
// Setiap entri penerima = { dept_id, head_name, qty }
// Satu dept bisa muncul beberapa kali jika punya banyak heads
// Key unik: dept_id + head_name (atau "" jika tanpa head)

function RecipientsInput({
  departments,
  recipients,
  onChange,
}: {
  departments: Dept[];
  recipients: DistributionRecipientInput[];
  onChange: (r: DistributionRecipientInput[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  // Buat daftar semua opsi: dept × head (flatten)
  type RecipOption = {
    dept_id: string;
    dept_code: string;
    dept_name: string;
    head_name: string; // "" jika tidak ada head
  };

  const allOptions: RecipOption[] = departments.flatMap((dept) => {
    if (!dept.heads || dept.heads.length === 0) {
      return [
        {
          dept_id: dept.id,
          dept_code: dept.code,
          dept_name: dept.name,
          head_name: "",
        },
      ];
    }
    return dept.heads.map((h) => ({
      dept_id: dept.id,
      dept_code: dept.code,
      dept_name: dept.name,
      head_name: h.name,
    }));
  });

  // Key unik per opsi
  const optKey = (o: { dept_id: string; head_name: string }) =>
    `${o.dept_id}__${o.head_name}`;

  // Opsi yang belum dipilih
  const selectedKeys = new Set(
    recipients.map((r) => `${r.dept_id}__${r.head_name ?? ""}`)
  );
  const available = allOptions.filter((o) => !selectedKeys.has(optKey(o)));

  const filtered = available.filter((o) => {
    const q = search.toLowerCase();
    return (
      o.dept_code.toLowerCase().includes(q) ||
      o.dept_name.toLowerCase().includes(q) ||
      o.head_name.toLowerCase().includes(q)
    );
  });

  function add(opt: RecipOption) {
    onChange([
      ...recipients,
      { dept_id: opt.dept_id, head_name: opt.head_name || null, qty: 1 },
    ]);
    setOpen(false);
    setSearch("");
  }

  function remove(key: string) {
    onChange(
      recipients.filter((r) => `${r.dept_id}__${r.head_name ?? ""}` !== key)
    );
  }

  function updateQty(key: string, qty: number) {
    onChange(
      recipients.map((r) =>
        `${r.dept_id}__${r.head_name ?? ""}` === key
          ? { ...r, qty: Math.max(1, qty) }
          : r
      )
    );
  }

  return (
    <div className="space-y-1.5 pl-4 border-l-2 border-slate-100 ml-1">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">
        Diterima Oleh
      </p>

      {recipients.length > 0 && (
        <div className="space-y-1">
          {recipients.map((entry) => {
            const dept = departments.find((d) => d.id === entry.dept_id);
            if (!dept) return null;
            const key = `${entry.dept_id}__${entry.head_name ?? ""}`;
            return (
              <div
                key={key}
                className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1">
                    <span className="font-mono text-[11px] font-bold text-blue-700">
                      {dept.code}
                    </span>
                    {entry.head_name && (
                      <span className="text-[11px] text-slate-600 truncate">
                        — {entry.head_name}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 truncate">
                    {dept.name}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-[10px] text-slate-400">Qty</span>
                  <input
                    type="number"
                    min={1}
                    value={entry.qty}
                    onChange={(e) =>
                      updateQty(key, parseInt(e.target.value) || 1)
                    }
                    className="w-14 border border-slate-200 rounded-lg px-1.5 py-1 text-xs text-center outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/10 transition-all bg-white"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => remove(key)}
                  className="p-0.5 text-slate-300 hover:text-red-500 transition-colors shrink-0"
                >
                  <XMarkIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {available.length > 0 && (
        <div className="relative">
          <button
            type="button"
            onClick={() => setOpen(!open)}
            className="flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-700 transition-colors"
          >
            <PlusIcon className="w-3 h-3" />
            Tambah penerima
          </button>
          {open && (
            <div className="absolute z-30 mt-1 w-72 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden">
              <div className="p-2 border-b border-slate-100">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                  <input
                    autoFocus
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari departemen atau nama..."
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg outline-none focus:border-blue-400"
                  />
                </div>
              </div>
              <div className="max-h-52 overflow-y-auto divide-y divide-slate-50">
                {filtered.length === 0 ? (
                  <p className="px-4 py-3 text-xs text-slate-400 text-center">
                    Tidak ditemukan
                  </p>
                ) : (
                  filtered.map((opt) => (
                    <button
                      key={optKey(opt)}
                      type="button"
                      onClick={() => add(opt)}
                      className="w-full flex items-center justify-between px-3 py-2.5 text-sm hover:bg-slate-50 transition-colors text-left"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs font-bold text-blue-700 shrink-0">
                            {opt.dept_code}
                          </span>
                          {opt.head_name && (
                            <span className="text-xs text-slate-700 truncate">
                              — {opt.head_name}
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate mt-0.5">
                          {opt.dept_name}
                        </p>
                      </div>
                      <PlusIcon className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-2" />
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {recipients.length === 0 && (
        <p className="text-[10px] text-slate-400 italic">Belum ada penerima.</p>
      )}
    </div>
  );
}

// ─── Item Row ─────────────────────────────────────────────────────────────────
function ItemRow({
  index,
  item,
  defaultDate,
  departments,
  docOptions,
  usedDocIds,
  lockedDeptCode,
  onChange,
  onRemove,
  canRemove,
}: {
  index: number;
  item: ItemFormEntry;
  defaultDate: string;
  departments: Dept[];
  docOptions: DocOption[];
  usedDocIds: string[];
  lockedDeptCode: string | null;
  onChange: (v: ItemFormEntry) => void;
  onRemove: () => void;
  canRemove: boolean;
}) {
  const hasOverride = item.override_date !== null && item.override_date !== "";

  return (
    <div
      className={clsx(
        "border rounded-xl p-3 space-y-2.5",
        hasOverride
          ? "bg-amber-50 border-amber-200"
          : "bg-slate-50 border-slate-200"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 w-5 shrink-0 text-center">
          {index + 1}
        </span>
        <DocDropdown
          docOptions={docOptions}
          value={item.document_id}
          usedIds={usedDocIds}
          lockedDeptCode={lockedDeptCode}
          onChange={(id) => onChange({ ...item, document_id: id })}
        />
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="p-1.5 text-slate-300 hover:text-red-500 transition-colors shrink-0"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="pl-7 flex items-center gap-2">
        {!hasOverride ? (
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400">
              Tanggal:{" "}
              <span className="font-medium text-slate-600">
                {formatDate(defaultDate)}
              </span>
              <span className="text-slate-300"> (sama dengan form)</span>
            </span>
            <button
              type="button"
              onClick={() => onChange({ ...item, override_date: defaultDate })}
              className="text-[10px] text-blue-500 hover:text-blue-700 font-medium transition-colors"
            >
              Ganti tanggal
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
            <input
              type="date"
              value={item.override_date ?? ""}
              onChange={(e) =>
                onChange({ ...item, override_date: e.target.value || null })
              }
              className="border border-amber-300 rounded-lg px-2 py-1 text-xs outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 transition-all bg-white"
            />
            <button
              type="button"
              onClick={() => onChange({ ...item, override_date: null })}
              className="text-[10px] text-slate-400 hover:text-slate-600 font-medium transition-colors"
            >
              Reset ke default
            </button>
          </div>
        )}
      </div>

      <RecipientsInput
        departments={departments}
        recipients={item.recipients}
        onChange={(r) => onChange({ ...item, recipients: r })}
      />
    </div>
  );
}

// ─── Form Modal ───────────────────────────────────────────────────────────────
// ─── Form Modal ───────────────────────────────────────────────────────────────
function FormModal({
  title,
  onClose,
  onImport,
  departments,
  docOptions,
  allDocOptions,
  defaultValues,
  createdBy,
  initialFormNumber,
}: {
  title: string;
  onClose: () => void;
  onImport?: () => void;
  departments: Dept[];
  docOptions: DocOption[];
  defaultValues?: Distribution;
  createdBy: string;
  initialFormNumber?: string;
  allDocOptions: DocOption[];
}) {
  const [includeInactive, setIncludeInactive] = useState(false);
  const activeDocOptions = includeInactive ? allDocOptions : docOptions;
  const isEdit = !!defaultValues;
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
  const [items, setItems] = useState<ItemFormEntry[]>(
    defaultValues?.items.length
      ? defaultValues.items.map((item) => ({
          document_id: item.document?.id ?? "",
          override_date: item.distributed_date ?? null,
          recipients: item.recipients
            .map((r) => ({
              dept_id: r.dept?.id ?? r.dept_id ?? "",
              head_name: r.head_name ?? null,
              qty: r.qty,
            }))
            .filter((r) => r.dept_id),
        }))
      : [emptyItem()]
  );
  const [notes, setNotes] = useState(defaultValues?.notes ?? "");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const handedByDept = dccDepartments.find((d) => d.id === handedByDeptId);
  const handedByHead = getDeptHead(handedByDept ?? null);

  const firstDocId = items.find((i) => i.document_id)?.document_id;
  const firstDoc = activeDocOptions.find((d) => d.id === firstDocId);
  const lockedDeptCode = firstDoc?.dept_code ?? null;

  const usedDocIds = items.map((i) => i.document_id).filter(Boolean);

  async function regenerateFormNumber() {
    setRegenerating(true);
    const next = await fetchNextFormNumber();
    setFormNumber(next);
    setRegenerating(false);
  }

  function addItem() {
    if (items.length >= MAX_DOCS) return;
    setItems([...items, emptyItem()]);
  }

  function updateItem(index: number, val: ItemFormEntry) {
    const next = [...items];
    if (index === 0 && val.document_id !== items[0].document_id) {
      const newDoc = activeDocOptions.find((d) => d.id === val.document_id);
      const newDeptCode = newDoc?.dept_code ?? null;
      const resetOthers = next.slice(1).map((item) => {
        const doc = activeDocOptions.find((d) => d.id === item.document_id);
        if (doc && newDeptCode && doc.dept_code !== newDeptCode) {
          return { ...item, document_id: "" };
        }
        return item;
      });
      setItems([val, ...resetOthers]);
      return;
    }
    next[index] = val;
    setItems(next);
  }

  function removeItem(index: number) {
    const next = items.filter((_, i) => i !== index);
    setItems(next.length ? next : [emptyItem()]);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const validItems = items.filter((i) => i.document_id);
    if (validItems.length === 0) {
      setError("Minimal 1 dokumen harus dipilih.");
      return;
    }

    const itemWithNoRecipient = validItems.find(
      (i) => i.recipients.length === 0
    );
    if (itemWithNoRecipient) {
      const doc = activeDocOptions.find(
        (d) => d.id === itemWithNoRecipient.document_id
      );
      setError(`Dokumen ${doc?.doc_number ?? ""} belum memiliki penerima.`);
      return;
    }

    const itemsWithDate: DistributionItemInput[] = validItems.map((item) => ({
      ...item,
      distributed_date: item.override_date ?? null,
    }));

    setLoading(true);
    const result = isEdit
      ? await updateDistribution(
          defaultValues.id,
          formNumber,
          distributedDate,
          handedByDeptId,
          itemsWithDate,
          notes
        )
      : await createDistribution(
          formNumber,
          distributedDate,
          handedByDeptId,
          itemsWithDate,
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
          <div className="flex items-center gap-2">
            {!isEdit && onImport && (
              <button
                type="button"
                onClick={onImport}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 transition-all"
              >
                <ArrowUpTrayIcon className="w-3.5 h-3.5" />
                Import Excel
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

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

            {/* Diserahkan Oleh */}
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

            {/* Daftar Dokumen */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  Daftar Dokumen
                  <span className="ml-1 font-normal text-slate-400 normal-case">
                    ({items.filter((i) => i.document_id).length}/{MAX_DOCS}) ·
                    dept yang sama
                  </span>
                </label>
                {lockedDeptCode && (
                  <span className="text-[10px] bg-blue-50 text-blue-700 font-mono font-bold px-2 py-0.5 rounded-full border border-blue-100">
                    {lockedDeptCode}
                  </span>
                )}
              </div>

              <label className="flex items-center gap-2 mb-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={includeInactive}
                  onChange={(e) => setIncludeInactive(e.target.checked)}
                  className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs text-slate-500">
                  Sertakan dokumen{" "}
                  <span className="font-medium">kadaluarsa/dihapus</span>{" "}
                  (khusus input data lama)
                </span>
              </label>

              <div className="space-y-2">
                {items.map((item, index) => (
                  <ItemRow
                    key={index}
                    index={index}
                    item={item}
                    defaultDate={distributedDate}
                    departments={departments}
                    docOptions={activeDocOptions}
                    usedDocIds={usedDocIds}
                    lockedDeptCode={lockedDeptCode}
                    onChange={(v) => updateItem(index, v)}
                    onRemove={() => removeItem(index)}
                    canRemove={items.length > 1}
                  />
                ))}
              </div>

              {items.length < MAX_DOCS && (
                <button
                  type="button"
                  onClick={addItem}
                  className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  Tambah dokumen
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

// ─── Year Tabs ────────────────────────────────────────────────────────────────
function YearTabs({
  years,
  activeYear,
  distributions,
  onSelect,
}: {
  years: string[];
  activeYear: string;
  distributions: Distribution[];
  onSelect: (year: string) => void;
}) {
  if (years.length === 0) return null;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <div className="flex overflow-x-auto scrollbar-hide border-b border-slate-100 px-2 pt-1">
        {years.map((year) => {
          const count = distributions.filter((d) =>
            d.distributed_date.startsWith(year)
          ).length;
          const isActive = year === activeYear;
          return (
            <button
              key={year}
              onClick={() => onSelect(year)}
              className={clsx(
                "relative flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap shrink-0 -mb-px",
                isActive
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-300"
              )}
            >
              {year}
              <span
                className={clsx(
                  "text-[11px] px-1.5 py-0.5 rounded-full font-semibold transition-all",
                  isActive
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
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
  categories,
  documentTypes,
}: {
  distributions: Distribution[];
  departments: Dept[];
  docOptions: DocOption[];
  currentUserId: string;
  initialFormNumber: string;
  categories: CategoryOpt[];
  documentTypes: DocTypeOpt[];
}) {
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [showFormView, setShowFormView] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editItem, setEditItem] = useState<Distribution | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Distribution | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [nextFormNumber, setNextFormNumber] = useState(initialFormNumber);

  // ─── Filter kategori & jenis dokumen ──────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");

  const availableTypes = useMemo(
    () =>
      filterCategory
        ? documentTypes.filter((t) => t.category_id === filterCategory)
        : documentTypes,
    [documentTypes, filterCategory]
  );

  // Kalau kategori diganti dan jenis yang lagi dipilih bukan bagian dari
  // kategori itu, reset filter jenis supaya tidak "nyangkut" ke opsi tak valid.
  useEffect(() => {
    if (filterType && !availableTypes.some((t) => t.id === filterType)) {
      setFilterType("");
    }
  }, [availableTypes, filterType]);

  const isFiltering = Boolean(filterCategory || filterType);

  // ─── Year tab state ───────────────────────────────────────────────────────
  const years = useMemo(
    () =>
      [
        ...new Set(distributions.map((d) => d.distributed_date.slice(0, 4))),
      ].sort((a, b) => Number(b) - Number(a)),
    [distributions]
  );

  const currentYear = new Date().getFullYear().toString();
  const [activeYear, setActiveYear] = useState<string>(
    () => years.find((y) => y === currentYear) ?? years[0] ?? currentYear
  );

  // Sync activeYear jika years berubah (misal setelah mutasi data)
  useEffect(() => {
    if (years.length > 0 && !years.includes(activeYear)) {
      setActiveYear(years[0]);
    }
  }, [years, activeYear]);

  function handleYearSelect(year: string) {
    setActiveYear(year);
    setCurrentPage(1);
    setSearch("");
  }

  // ─── Fetch form number saat modal create dibuka ───────────────────────────
  useEffect(() => {
    if (showCreate) {
      fetchNextFormNumber().then(setNextFormNumber);
    }
  }, [showCreate]);

  // ─── Filter: tahun aktif + kategori/jenis + search ─────────────────────────
  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return distributions
      .filter((d) => d.distributed_date.startsWith(activeYear))
      .filter((d) => {
        if (!filterCategory && !filterType) return true;
        const info = getDistDocInfo(d);
        if (filterCategory && info.category_id !== filterCategory) return false;
        if (filterType && info.type_id !== filterType) return false;
        return true;
      })
      .filter(
        (d) =>
          d.form_number.toLowerCase().includes(q) ||
          (d.handed_by_dept?.name.toLowerCase().includes(q) ?? false) ||
          (d.handed_by_dept?.code.toLowerCase().includes(q) ?? false)
      );
  }, [distributions, activeYear, search, filterCategory, filterType]);

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

  function getUniqueDates(dist: Distribution): string[] {
    const base = dist.distributed_date;
    const overrides = dist.items
      .map((i) => i.distributed_date)
      .filter((d): d is string => !!d && d !== base);
    return Array.from(new Set([base, ...overrides]));
  }

  function getUniqueRecipients(dist: Distribution) {
    const map = new Map<string, { code: string; name: string }>();
    dist.items.forEach((item) => {
      item.recipients.forEach((r) => {
        if (r.dept && !map.has(r.dept.id)) {
          map.set(r.dept.id, { code: r.dept.code, name: r.dept.name });
        }
      });
    });
    return Array.from(map.values());
  }

  function resetFilter() {
    setFilterCategory("");
    setFilterType("");
    setCurrentPage(1);
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
        {isFiltering && (
          <div className="ml-auto text-right">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Sesuai Filter ({activeYear})
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {filtered.length}
            </p>
          </div>
        )}
      </div>

      {/* ─── Year Tabs ─────────────────────────────────────────────────────── */}
      <YearTabs
        years={years}
        activeYear={activeYear}
        distributions={distributions}
        onSelect={handleYearSelect}
      />

      {/* ─── Filter kategori & jenis dokumen ──────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide shrink-0">
            <FunnelIcon className="w-3.5 h-3.5" />
            Filter
          </div>

          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:border-blue-400 transition-all"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-slate-200 rounded-xl px-3 py-2 text-xs bg-white outline-none focus:border-blue-400 transition-all"
          >
            <option value="">Semua Jenis Dokumen</option>
            {availableTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>

          {isFiltering && (
            <button
              type="button"
              onClick={resetFilter}
              className="flex items-center gap-1 text-xs font-medium text-slate-400 hover:text-red-500 transition-colors"
            >
              <XMarkIcon className="w-3.5 h-3.5" />
              Reset filter
            </button>
          )}

          {isFiltering && (
            <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              {filtered.length} form ditemukan
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            placeholder={`Cari form di tahun ${activeYear}...`}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>
        <button
          onClick={() => setShowFormView(true)}
          className="flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-all shrink-0"
        >
          <EyeIcon className="w-4 h-4" />
          Lihat Form
        </button>
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
                  Dokumen
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Penerima
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
                    className="px-6 py-12 text-center text-slate-400 text-sm"
                  >
                    {search || isFiltering
                      ? `Tidak ada form yang cocok dengan filter/pencarian di tahun ${activeYear}.`
                      : `Belum ada form distribusi di tahun ${activeYear}.`}
                  </td>
                </tr>
              )}
              {paginated.map((dist) => {
                const handedHead = getDeptHead(dist.handed_by_dept);
                const uniqueRecipients = getUniqueRecipients(dist);
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
                      {(() => {
                        const dates = getUniqueDates(dist);
                        return (
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-1.5">
                              <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span>{formatDate(dist.distributed_date)}</span>
                            </div>
                            {dates.slice(1).map((d) => (
                              <div
                                key={d}
                                className="flex items-center gap-1.5 pl-0.5"
                              >
                                <CalendarIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                <span className="text-amber-600 text-xs">
                                  {formatDate(d)}
                                </span>
                              </div>
                            ))}
                          </div>
                        );
                      })()}
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
                      <div className="flex flex-wrap gap-1">
                        {uniqueRecipients.slice(0, 4).map((r) => (
                          <span
                            key={r.code}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full"
                            title={`${r.code} - ${r.name}`}
                          >
                            <BuildingOfficeIcon className="w-3 h-3" />
                            {r.code}
                          </span>
                        ))}
                        {uniqueRecipients.length > 4 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-xs rounded-full">
                            +{uniqueRecipients.length - 4}
                          </span>
                        )}
                      </div>
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
            {search || isFiltering
              ? `Tidak ada form yang cocok dengan filter/pencarian di tahun ${activeYear}.`
              : `Belum ada form distribusi di tahun ${activeYear}.`}
          </div>
        )}
        {paginated.map((dist) => {
          const handedHead = getDeptHead(dist.handed_by_dept);
          const uniqueRecipients = getUniqueRecipients(dist);
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
                  <div className="mt-1.5 space-y-0.5">
                    {(() => {
                      const dates = getUniqueDates(dist);
                      return (
                        <>
                          <p className="text-xs text-slate-400 flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3 shrink-0" />
                            {formatDate(dist.distributed_date)}
                          </p>
                          {dates.slice(1).map((d) => (
                            <p
                              key={d}
                              className="text-xs text-amber-500 flex items-center gap-1"
                            >
                              <CalendarIcon className="w-3 h-3 shrink-0" />
                              {formatDate(d)}
                            </p>
                          ))}
                        </>
                      );
                    })()}
                  </div>
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
                    {uniqueRecipients.slice(0, 4).map((r) => (
                      <span
                        key={r.code}
                        className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-medium rounded-full"
                      >
                        {r.code}
                      </span>
                    ))}
                    {uniqueRecipients.length > 4 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-400 text-[10px] rounded-full">
                        +{uniqueRecipients.length - 4}
                      </span>
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
          onImport={() => {
            setShowCreate(false);
            setShowImport(true);
          }}
          departments={departments}
          docOptions={docOptions}
          allDocOptions={docOptions}
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
          allDocOptions={docOptions}
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

      {/* View Format Form */}
      {showFormView && (
        <DistributionSpreadsheetView
          distributions={distributions}
          onClose={() => setShowFormView(false)}
        />
      )}

      {/* Modal Import Excel */}
      {showImport && (
        <ImportDistributionModal
          onClose={() => setShowImport(false)}
          departments={departments}
          docOptions={docOptions}
          currentUserId={currentUserId}
        />
      )}
    </div>
  );
}
