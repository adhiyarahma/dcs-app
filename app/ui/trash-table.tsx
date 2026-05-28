"use client";

import { useState, useMemo, useTransition } from "react";
import clsx from "clsx";
import {
  MagnifyingGlassIcon,
  ArrowUturnLeftIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  ArchiveBoxXMarkIcon,
  FunnelIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  ChevronUpDownIcon,
} from "@heroicons/react/24/outline";
import { restoreDocument, permanentDeleteDocument } from "@/app/lib/actions";

type TrashedDoc = {
  id: string;
  doc_number: string;
  title: string;
  revision: number;
  updated_at: string;
  category_id: string;
  type_id: string;
  category_name: string;
  type_name: string;
  department_code: string;
  uploaded_by_name: string;
};

type SortKey =
  | "doc_number"
  | "title"
  | "revision"
  | "updated_at"
  | "category_name";
type SortOrder = "asc" | "desc";

const PAGE_SIZE = 10;

// ─── Pagination ───────────────────────────────────────────────────────────
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

// ─── Restore Confirm Modal ────────────────────────────────────────────────
function RestoreModal({
  doc,
  onConfirm,
  onCancel,
  loading,
}: {
  doc: TrashedDoc;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <ArrowUturnLeftIcon className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            Pulihkan Dokumen
          </h2>
          <p className="text-sm text-slate-500">
            Pulihkan{" "}
            <span className="font-semibold text-slate-700">"{doc.title}"</span>?
          </p>
          <p className="text-xs text-blue-400 mt-1 font-medium">
            Dokumen akan dikembalikan ke daftar aktif.
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
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {loading ? "Memulihkan..." : "Pulihkan"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Single Delete Modal ──────────────────────────────────────────────────
function DeleteModal({
  doc,
  onConfirm,
  onCancel,
  loading,
}: {
  doc: TrashedDoc;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
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
            Hapus Permanen
          </h2>
          <p className="text-sm text-slate-500">
            Hapus{" "}
            <span className="font-semibold text-slate-700">"{doc.title}"</span>?
          </p>
          <p className="text-xs text-red-400 mt-1 font-medium">
            ⚠ Dokumen akan dihapus permanen dan tidak bisa dipulihkan.
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
            {loading ? "Menghapus..." : "Hapus Permanen"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Delete Modal ────────────────────────────────────────────────────
function BulkDeleteModal({
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
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
            Hapus Permanen
          </h2>
          <p className="text-sm text-slate-500">
            Hapus{" "}
            <span className="font-semibold text-slate-700">
              {count} dokumen
            </span>{" "}
            yang dipilih?
          </p>
          <p className="text-xs text-red-400 mt-1 font-medium">
            ⚠ Semua dokumen akan dihapus permanen dan tidak bisa dipulihkan.
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
            {loading ? "Menghapus..." : `Hapus ${count} Dokumen`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Bulk Restore Modal ───────────────────────────────────────────────────
function BulkRestoreModal({
  count,
  onConfirm,
  onCancel,
  loading,
}: {
  count: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center">
          <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center mb-3">
            <ArrowUturnLeftIcon className="w-6 h-6 text-blue-500" />
          </div>
          <h2 className="text-sm font-bold text-slate-800 mb-1">
            Pulihkan Dokumen
          </h2>
          <p className="text-sm text-slate-500">
            Pulihkan{" "}
            <span className="font-semibold text-slate-700">
              {count} dokumen
            </span>{" "}
            yang dipilih?
          </p>
          <p className="text-xs text-blue-400 mt-1 font-medium">
            Semua dokumen akan dikembalikan ke daftar aktif.
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
            className="flex-1 px-4 py-2.5 text-sm font-bold bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-all"
          >
            {loading ? "Memulihkan..." : `Pulihkan ${count} Dokumen`}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────
export default function TrashTable({ documents }: { documents: TrashedDoc[] }) {
  const [isPending, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState("");
  const [sortKey, setSortKey] = useState<SortKey>("updated_at");
  const [sortOrder, setSortOrder] = useState<SortOrder>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Modal states
  const [restoreTarget, setRestoreTarget] = useState<TrashedDoc | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<TrashedDoc | null>(null);
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false);
  const [showBulkRestoreModal, setShowBulkRestoreModal] = useState(false);

  // Bulk select
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Unique categories from documents
  const categories = useMemo(() => {
    const map = new Map<string, string>();
    documents.forEach((d) => {
      if (d.category_id && d.category_name)
        map.set(d.category_id, d.category_name);
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [documents]);

  // Unique types filtered by selected category
  const filteredTypes = useMemo(() => {
    const map = new Map<string, string>();
    documents.forEach((d) => {
      if (!filterCategory || d.category_id === filterCategory) {
        if (d.type_id && d.type_name) map.set(d.type_id, d.type_name);
      }
    });
    return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
  }, [documents, filterCategory]);

  // Filtered + sorted docs
  const filteredDocs = useMemo(() => {
    let result = documents.filter((d) => {
      const matchSearch =
        !search ||
        d.title.toLowerCase().includes(search.toLowerCase()) ||
        d.doc_number.toLowerCase().includes(search.toLowerCase());
      const matchCat = !filterCategory || d.category_id === filterCategory;
      const matchType = !filterType || d.type_id === filterType;
      return matchSearch && matchCat && matchType;
    });

    result = [...result].sort((a, b) => {
      let valA: any = a[sortKey] ?? "";
      let valB: any = b[sortKey] ?? "";
      if (sortKey === "updated_at") {
        valA = new Date(valA).getTime();
        valB = new Date(valB).getTime();
      }
      if (valA < valB) return sortOrder === "asc" ? -1 : 1;
      if (valA > valB) return sortOrder === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [documents, search, filterCategory, filterType, sortKey, sortOrder]);

  const totalPages = Math.ceil(filteredDocs.length / PAGE_SIZE);
  const paginatedDocs = filteredDocs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Visible IDs on current page
  const visibleIds = paginatedDocs.map((d) => d.id);
  const isAllPageSelected =
    visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id));
  const isIndeterminate =
    !isAllPageSelected && visibleIds.some((id) => selectedIds.has(id));

  function toggleSelectAll() {
    if (isAllPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function clearSelection() {
    setSelectedIds(new Set());
  }

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortOrder("asc");
    }
    setCurrentPage(1);
  };

  // ── Restore single ──
  async function handleRestore() {
    if (!restoreTarget) return;
    setLoading(true);
    startTransition(async () => {
      const result = await restoreDocument(restoreTarget.id);
      setLoading(false);
      setRestoreTarget(null);
      if (result?.error) alert(result.error);
      else {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(restoreTarget.id);
          return next;
        });
      }
    });
  }

  // ── Delete single ──
  async function handleDelete() {
    if (!deleteTarget) return;
    setLoading(true);
    await permanentDeleteDocument(deleteTarget.id);
    setLoading(false);
    setDeleteTarget(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(deleteTarget.id);
      return next;
    });
  }

  // ── Bulk delete ──
  async function handleBulkDelete() {
    setLoading(true);
    await Promise.all(
      Array.from(selectedIds).map((id) => permanentDeleteDocument(id))
    );
    setLoading(false);
    setShowBulkDeleteModal(false);
    setSelectedIds(new Set());
  }

  // ── Bulk restore ──
  async function handleBulkRestore() {
    setLoading(true);
    startTransition(async () => {
      await Promise.all(
        Array.from(selectedIds).map((id) => restoreDocument(id))
      );
      setLoading(false);
      setShowBulkRestoreModal(false);
      setSelectedIds(new Set());
    });
  }

  const SortableHeader = ({
    label,
    sortKeyParam,
  }: {
    label: string;
    sortKeyParam: SortKey;
  }) => {
    const isActive = sortKey === sortKeyParam;
    return (
      <th
        className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest cursor-pointer hover:bg-slate-100 hover:text-slate-600 transition-colors group select-none"
        onClick={() => handleSort(sortKeyParam)}
      >
        <div className="flex items-center gap-1.5">
          {label}
          <span className="text-slate-300 group-hover:text-slate-400">
            {!isActive ? (
              <ChevronUpDownIcon className="w-3.5 h-3.5" />
            ) : sortOrder === "asc" ? (
              <ChevronUpIcon className="w-3.5 h-3.5 text-blue-600" />
            ) : (
              <ChevronDownIcon className="w-3.5 h-3.5 text-blue-600" />
            )}
          </span>
        </div>
      </th>
    );
  };

  const hasFilter = search || filterCategory || filterType;

  return (
    <div className="space-y-5">
      {/* Stat card */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-rose-50 rounded-xl text-rose-600 shrink-0">
            <ArchiveBoxXMarkIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Di Trash
            </p>
            <p className="text-2xl font-bold text-slate-900">
              {documents.length}
            </p>
          </div>
        </div>

        {/* Category breakdown */}
        {categories.slice(0, 2).map((cat) => {
          const count = documents.filter(
            (d) => d.category_id === cat.id
          ).length;
          return (
            <div
              key={cat.id}
              className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:border-slate-300 transition-colors"
              onClick={() => {
                setFilterCategory(filterCategory === cat.id ? "" : cat.id);
                setCurrentPage(1);
              }}
            >
              <div
                className={clsx(
                  "p-3 rounded-xl shrink-0",
                  filterCategory === cat.id
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-500"
                )}
              >
                <TrashIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                  {cat.name}
                </p>
                <p className="text-2xl font-bold text-slate-900">{count}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Cari nomor / judul dokumen..."
            value={search}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all"
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
          />
        </div>

        <div className="relative">
          <FunnelIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <select
            value={filterCategory}
            onChange={(e) => {
              setFilterCategory(e.target.value);
              setFilterType("");
              setCurrentPage(1);
            }}
            className="pl-8 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer h-full"
          >
            <option value="">Semua Kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
        </div>

        {filterCategory && (
          <div className="relative">
            <select
              value={filterType}
              onChange={(e) => {
                setFilterType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 pr-8 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-600 outline-none focus:border-blue-500 transition-all appearance-none cursor-pointer h-full"
            >
              <option value="">Semua Jenis</option>
              {filteredTypes.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
            <ChevronDownIcon className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
          </div>
        )}

        {hasFilter && (
          <button
            onClick={() => {
              setSearch("");
              setFilterCategory("");
              setFilterType("");
              setCurrentPage(1);
            }}
            className="px-3 py-2 text-xs font-medium text-slate-500 hover:text-red-600 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all"
          >
            Reset filter
          </button>
        )}
      </div>

      {/* Summary */}
      {hasFilter && (
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <span className="text-slate-500">Menampilkan</span>
          <span className="font-bold text-slate-800">
            {filteredDocs.length}
          </span>
          <span className="text-slate-500">dokumen</span>
          {filterCategory && (
            <>
              <span className="text-slate-300">·</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                {categories.find((c) => c.id === filterCategory)?.name}
              </span>
            </>
          )}
          {filterType && (
            <>
              <span className="text-slate-300">›</span>
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full font-medium">
                {filteredTypes.find((t) => t.id === filterType)?.name}
              </span>
            </>
          )}
        </div>
      )}

      {/* Bulk action bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl">
          <div className="flex items-center gap-3">
            <span className="text-sm font-bold text-slate-700">
              {selectedIds.size} dokumen dipilih
            </span>
            <button
              onClick={clearSelection}
              className="text-xs text-slate-400 hover:text-slate-600 underline underline-offset-2 transition-colors"
            >
              Batalkan pilihan
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowBulkRestoreModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-bold rounded-xl hover:bg-blue-700 transition-all active:scale-95"
            >
              <ArrowUturnLeftIcon className="w-4 h-4" />
              Pulihkan {selectedIds.size}
            </button>
            <button
              onClick={() => setShowBulkDeleteModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm font-bold rounded-xl hover:bg-red-700 transition-all active:scale-95"
            >
              <TrashIcon className="w-4 h-4" />
              Hapus {selectedIds.size}
            </button>
          </div>
        </div>
      )}

      {/* Table — desktop */}
      <div className="hidden sm:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="pl-4 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={isAllPageSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = isIndeterminate;
                    }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
                    title="Pilih semua di halaman ini"
                  />
                </th>
                <SortableHeader label="No. Dok" sortKeyParam="doc_number" />
                <SortableHeader label="Judul" sortKeyParam="title" />
                <SortableHeader label="Rev" sortKeyParam="revision" />
                <SortableHeader label="Kategori" sortKeyParam="category_name" />
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Jenis
                </th>
                <th className="text-left px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Dept
                </th>
                <SortableHeader
                  label="Dihapus Pada"
                  sortKeyParam="updated_at"
                />
                <th className="text-right px-6 py-3 text-[11px] font-bold text-slate-400 uppercase tracking-widest">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedDocs.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-2 text-slate-400">
                      <ArchiveBoxXMarkIcon className="w-10 h-10 text-slate-200" />
                      <p className="text-sm">
                        Tidak ada dokumen di keranjang sampah.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
              {paginatedDocs.map((doc) => (
                <tr
                  key={doc.id}
                  className={clsx(
                    "transition-colors border-b border-slate-100 last:border-none",
                    selectedIds.has(doc.id)
                      ? "bg-red-50"
                      : "bg-white hover:bg-slate-50"
                  )}
                >
                  <td className="pl-4 pr-2 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(doc.id)}
                      onChange={() => toggleSelectOne(doc.id)}
                      className="w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                      {doc.doc_number}
                    </span>
                  </td>
                  <td className="px-6 py-4 max-w-[220px]">
                    <p className="text-xs text-slate-700 truncate">
                      {doc.title}
                    </p>
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-700">
                      Rev. {doc.revision}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-500">
                      {doc.category_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs text-slate-400">
                      {doc.type_name}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {doc.department_code ? (
                      <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-1 rounded-lg">
                        {doc.department_code}
                      </span>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="font-mono text-xs text-slate-500">
                      {new Date(doc.updated_at).toLocaleDateString("id-ID")}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => setRestoreTarget(doc)}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Pulihkan"
                      >
                        <ArrowUturnLeftIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Hapus Permanen"
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
      <div className="sm:hidden space-y-3">
        {paginatedDocs.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={isAllPageSelected}
              ref={(el) => {
                if (el) el.indeterminate = isIndeterminate;
              }}
              onChange={toggleSelectAll}
              className="w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer"
            />
            <span className="text-xs text-slate-500">
              Pilih semua di halaman ini
            </span>
          </div>
        )}

        {paginatedDocs.length === 0 && (
          <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
            <ArchiveBoxXMarkIcon className="w-10 h-10 text-slate-200 mx-auto mb-2" />
            <p className="text-slate-400 text-sm">
              Tidak ada dokumen di keranjang sampah.
            </p>
          </div>
        )}

        {paginatedDocs.map((doc) => (
          <div
            key={doc.id}
            className={clsx(
              "border rounded-2xl px-4 py-3 shadow-sm transition-colors",
              selectedIds.has(doc.id)
                ? "ring-2 ring-red-400 border-red-300 bg-red-50"
                : "bg-white border-slate-200"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0 w-full">
                <input
                  type="checkbox"
                  checked={selectedIds.has(doc.id)}
                  onChange={() => toggleSelectOne(doc.id)}
                  className="mt-1 w-4 h-4 rounded border-slate-300 text-red-600 accent-red-600 cursor-pointer shrink-0"
                />
                <div className="min-w-0 w-full">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs font-bold text-slate-700 whitespace-nowrap">
                      {doc.doc_number}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Rev. {doc.revision}
                    </span>
                  </div>
                  <p className="font-medium text-slate-800 text-sm mt-1 truncate">
                    {doc.title}
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {doc.category_name} · {doc.type_name}
                  </p>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-2">
                    {doc.department_code && (
                      <span className="text-[10px] text-slate-400">
                        Dept:{" "}
                        <span className="font-medium text-slate-600">
                          {doc.department_code}
                        </span>
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">
                      Dihapus:{" "}
                      <span className="font-medium text-slate-600">
                        {new Date(doc.updated_at).toLocaleDateString("id-ID")}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button
                  onClick={() => setRestoreTarget(doc)}
                  className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <ArrowUturnLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteTarget(doc)}
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}

        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      {/* Modals */}
      {restoreTarget && (
        <RestoreModal
          doc={restoreTarget}
          onConfirm={handleRestore}
          onCancel={() => setRestoreTarget(null)}
          loading={loading}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          doc={deleteTarget}
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={loading}
        />
      )}
      {showBulkDeleteModal && (
        <BulkDeleteModal
          count={selectedIds.size}
          onConfirm={handleBulkDelete}
          onCancel={() => setShowBulkDeleteModal(false)}
          loading={loading}
        />
      )}
      {showBulkRestoreModal && (
        <BulkRestoreModal
          count={selectedIds.size}
          onConfirm={handleBulkRestore}
          onCancel={() => setShowBulkRestoreModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
}
